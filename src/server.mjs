import express from 'express';
import cors from 'cors';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { PrismaClient, AttendanceStatus, UserRole } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const validAttendanceStatuses = Object.values(AttendanceStatus);
const CHECKIN_ID_DOMAIN = 'studentid.attendance.local';

function normalizeCode(code) {
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

function createCheckInCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return value;
}

function normalizeStudentId(studentId) {
  return typeof studentId === 'string' ? studentId.trim().toUpperCase() : '';
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

function isHashedPassword(password) {
  return typeof password === 'string' && password.startsWith('scrypt$');
}

function verifyPassword(inputPassword, storedPassword) {
  if (typeof inputPassword !== 'string' || typeof storedPassword !== 'string') {
    return false;
  }

  if (!isHashedPassword(storedPassword)) {
    //  fallback for old accounts
    return inputPassword === storedPassword;
  }

  const parts = storedPassword.split('$');
  if (parts.length !== 3) {
    return false;
  }

  const [, salt, storedKeyHex] = parts;
  if (!salt || !storedKeyHex) {
    return false;
  }

  const derivedInputKey = scryptSync(inputPassword, salt, 64);
  const storedKeyBuffer = Buffer.from(storedKeyHex, 'hex');

  if (storedKeyBuffer.length !== derivedInputKey.length) {
    return false;
  }

  return timingSafeEqual(derivedInputKey, storedKeyBuffer);
}

function studentIdToEmail(studentId) {
  const normalized = normalizeStudentId(studentId);
  if (!normalized) return '';
  const safeLocalPart = normalized.replace(/[^A-Z0-9._-]/g, '');
  return `${safeLocalPart.toLowerCase()}@${CHECKIN_ID_DOMAIN}`;
}

function emailToStudentId(email) {
  if (typeof email !== 'string') return null;
  const [local, domain] = email.toLowerCase().split('@');
  if (!local || domain !== CHECKIN_ID_DOMAIN) return null;
  return local.toUpperCase();
}

function decorateUser(user) {
  if (!user) return user;
  const { password, ...safeUser } = user;
  const universityId = emailToStudentId(safeUser.email);
  return {
    ...safeUser,
    ...(universityId ? { universityId } : {}),
  };
}

function decorateAttendanceRecord(record) {
  if (!record) return record;
  return {
    ...record,
    student: decorateUser(record.student),
  };
}

function toClientRole(role) {
  if (role === UserRole.FACULTY) return 'instructor';
  if (role === UserRole.STUDENT) return 'student';
  return 'admin';
}

function toAuthClientUser(user) {
  const safeUser = decorateUser(user);
  return {
    ...safeUser,
    role: toClientRole(user.role),
  };
}

function activeSessionWhere() {
  const now = new Date();
  return {
    endsAt: { gt: now },
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: now } },
    ],
  };
}

function normalizeCourseSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
    return null;
  }

  const rawDays = Array.isArray(schedule.days) ? schedule.days : [];
  const days = rawDays
    .map((day) => (typeof day === 'string' ? day.trim() : ''))
    .filter(Boolean);

  const startTime = typeof schedule.startTime === 'string' ? schedule.startTime.trim() : '';
  const endTime = typeof schedule.endTime === 'string' ? schedule.endTime.trim() : '';
  const location = typeof schedule.location === 'string' ? schedule.location.trim() : '';

  if (days.length === 0 && !startTime && !endTime && !location) {
    return null;
  }

  return {
    days,
    startTime,
    endTime,
    location,
  };
}

// ---------- Middleware ----------
app.use(express.json());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowedOrigins = new Set([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://finish-integration.d18ozidbfuhuju.amplifyapp.com',
      ]);

      const allowedDevLanPatterns = [
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/,
        /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/,
        /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:5173$/,
      ];

      if (
        allowedOrigins.has(origin) ||
        allowedDevLanPatterns.some((pattern) => pattern.test(origin))
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

//  Health Check 
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    res.json({
      ok: true,
      service: 'attendance-tracker-api',
      prisma: 'connected',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e?.message });
  }
});

// AUTH
app.post('/auth/register', async (req, res) => {
  try {
    let { firstName, lastName, email, password } = req.body;

    firstName = typeof firstName === 'string' ? firstName.trim() : '';
    lastName = typeof lastName === 'string' ? lastName.trim() : '';
    email = typeof email === 'string' ? email.trim().toLowerCase() : '';
    password = typeof password === 'string' ? password : '';
    const dbRole = UserRole.FACULTY;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: 'firstName, lastName, email, and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashPassword(password),
        role: dbRole,
        facultyProfile: { create: {} },
      },
      include: {
        studentProfile: true,
        facultyProfile: true,
      },
    });

    res.status(201).json(toAuthClientUser(user));
  } catch (e) {
    console.error(e);
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'Email is already registered' });
    }
    res.status(500).json({ error: e.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    email = typeof email === 'string' ? email.trim().toLowerCase() : '';
    password = typeof password === 'string' ? password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
        facultyProfile: true,
      },
    });

    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!isHashedPassword(user.password)) {
      const upgradedHash = hashPassword(password);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: upgradedHash },
      });
      user.password = upgradedHash;
    }

    if (user.role !== UserRole.FACULTY) {
      return res.status(403).json({ error: 'Student dashboard login is disabled' });
    }

    res.json(toAuthClientUser(user));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// USERS / PROFILES 

// GET /students
app.get('/students', async (_req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: UserRole.STUDENT },
      include: {
        studentProfile: true,
        attendances: {
          include: {
            session: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });
    res.json(students.map(decorateUser));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /faculty - 
app.get('/faculty', async (_req, res) => {
  try {
    const faculty = await prisma.user.findMany({
      where: { role: UserRole.FACULTY },
      include: {
        facultyProfile: true,
        courses: true, // courses they teach
      },
    });
    res.json(faculty);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /students/:id - 
app.get('/students/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const student = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        attendances: {
          include: {
            session: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!student || student.role !== UserRole.STUDENT) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(decorateUser(student));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// COURSES / SESSIONS 

// GET /courses - 
app.get('/courses', async (req, res) => {
  try {
    const { facultyUserId, facultyEmail } = req.query;
    const courses = await prisma.course.findMany({
      where: facultyUserId
        ? { facultyUserId: String(facultyUserId) }
        : facultyEmail
          ? { faculty: { email: String(facultyEmail).trim().toLowerCase() } }
          : undefined,
      include: {
        faculty: true,
        sessions: true,
      },
    });
    res.json(courses);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST /courses
app.post('/courses', async (req, res) => {
  try {
    let {
      code,
      title,
      semester,
      schedule,
      facultyUserId,
      facultyEmail,
      facultyFirstName,
      facultyLastName,
    } = req.body;

    code = typeof code === 'string' ? code.trim().toUpperCase() : '';
    title = typeof title === 'string' ? title.trim() : '';
    semester = typeof semester === 'string' ? semester.trim() : null;
    facultyUserId = typeof facultyUserId === 'string' ? facultyUserId.trim() : '';
    facultyEmail = typeof facultyEmail === 'string' ? facultyEmail.trim().toLowerCase() : '';
    facultyFirstName = typeof facultyFirstName === 'string' ? facultyFirstName.trim() : 'Instructor';
    facultyLastName = typeof facultyLastName === 'string' ? facultyLastName.trim() : 'User';
    const normalizedSchedule = normalizeCourseSchedule(schedule);

    if (!code || !title || (!facultyUserId && !facultyEmail)) {
      return res.status(400).json({
        error: 'code, title, and faculty identity are required',
      });
    }

    let faculty = null;
    if (facultyUserId) {
      faculty = await prisma.user.findUnique({
        where: { id: facultyUserId },
      });
    }

    if (!faculty && facultyEmail) {
      faculty = await prisma.user.findUnique({
        where: { email: facultyEmail },
      });
    }

    if (faculty && faculty.role !== UserRole.FACULTY) {
      return res.status(400).json({ error: 'Instructor account must be a faculty user' });
    }

    if (!faculty) {
      faculty = await prisma.user.create({
        data: {
          email: facultyEmail,
          firstName: facultyFirstName || 'Instructor',
          lastName: facultyLastName || 'User',
          role: UserRole.FACULTY,
          password: hashPassword(`faculty_${Math.random().toString(36).slice(2, 12)}`),
          facultyProfile: {
            create: {},
          },
        },
      });
    }

    const course = await prisma.course.create({
      data: {
        code,
        title,
        semester: semester || null,
        schedule: normalizedSchedule,
        facultyUserId: faculty.id,
      },
      include: {
        faculty: true,
        sessions: true,
      },
    });

    res.status(201).json(course);
  } catch (e) {
    console.error(e);

    if (e.code === 'P2002') {
      return res.status(409).json({
        error: 'A course with this code and semester already exists',
      });
    }

    res.status(500).json({ error: e.message });
  }
});

// DELETE /courses/:id
app.delete('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const facultyUserId = typeof req.query.facultyUserId === 'string' ? req.query.facultyUserId.trim() : '';
    const facultyEmail = typeof req.query.facultyEmail === 'string' ? req.query.facultyEmail.trim().toLowerCase() : '';

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        faculty: true,
        sessions: {
          select: { id: true },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (facultyUserId && course.facultyUserId !== facultyUserId) {
      return res.status(403).json({ error: 'You can only delete your own courses' });
    }

    if (facultyEmail && course.faculty?.email?.toLowerCase() !== facultyEmail) {
      return res.status(403).json({ error: 'You can only delete your own courses' });
    }

    const sessionIds = course.sessions.map((session) => session.id);

    await prisma.$transaction(async (tx) => {
      if (sessionIds.length > 0) {
        await tx.attendance.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
      }

      await tx.session.deleteMany({
        where: { courseId: id },
      });

      await tx.course.delete({
        where: { id },
      });
    });

    res.json({
      ok: true,
      deletedCourseId: id,
      deletedSessionCount: sessionIds.length,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /courses/:id 
app.get('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        faculty: true,
        sessions: true,
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(course);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /courses/:id/sessions 
app.get('/courses/:id/sessions', async (req, res) => {
  try {
    const { id } = req.params;

    const sessions = await prisma.session.findMany({
      where: { courseId: id },
      include: {
        course: true,
      },
    });

    res.json(sessions);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /sessions/active
app.get('/sessions/active', async (req, res) => {
  try {
    const { courseId } = req.query;
    const sessions = await prisma.session.findMany({
      where: {
        ...activeSessionWhere(),
        ...(courseId ? { courseId: String(courseId) } : {}),
      },
      include: {
        course: true,
      },
      orderBy: {
        startsAt: 'desc',
      },
    });

    res.json(sessions);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /sessions/lookup?code=ABC123
app.get('/sessions/lookup', async (req, res) => {
  try {
    const code = normalizeCode(req.query.code);

    if (!code) {
      return res.status(400).json({ error: 'code query param is required' });
    }

    const session = await prisma.session.findFirst({
      where: {
        ...activeSessionWhere(),
        qToken: code,
      },
      include: {
        course: true,
      },
      orderBy: {
        startsAt: 'desc',
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Active session not found for code' });
    }

    res.json(session);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// CREATE SESSION
app.post("/sessions", async (req, res) => {
  try {
    const { courseId, startsAt, endsAt, qToken, expiresAt } = req.body;

    if (!courseId) return res.status(400).json({ error: "courseId required" });

    const start = startsAt ? new Date(startsAt) : new Date();

    // endsAt is REQUIRED in the schema
    const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 60 * 60 * 1000);
    const normalizedToken = normalizeCode(qToken) || createCheckInCode();
    const sessionExpiresAt = expiresAt ? new Date(expiresAt) : end;

    const session = await prisma.session.create({
      data: {
        courseId,
        startsAt: start,
        endsAt: end,
        qToken: normalizedToken,
        expiresAt: sessionExpiresAt,
      },
      include: { course: true },
    });

    res.json(session);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /sessions/:id/attendance
app.get('/sessions/:id/attendance', async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await prisma.attendance.findMany({
      where: { sessionId: id },
      include: {
        student: true,
        session: {
          include: {
            course: true,
          },
        },
      },
    });

    res.json(attendance.map(decorateAttendanceRecord));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// END SESSION (set endsAt to now)
app.patch("/sessions/:id/end", async (req, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.session.update({
      where: { id },
      data: {
        endsAt: new Date(),
        expiresAt: new Date(), // optional: QR expires immediately
      },
    });

    res.json(session);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ATTENDANCE CHECK-IN 

// POST /attendance
// Body: { studentUserId, sessionId, status }  (status optional; defaults to PRESENT)
app.post('/attendance', async (req, res) => {
  try {
    let { studentUserId, sessionId, status } = req.body;

    if (!studentUserId || !sessionId) {
      return res
        .status(400)
        .json({ error: 'studentUserId and sessionId are required' });
    }

    // default to PRESENT 
    if (!status) {
      status = AttendanceStatus.PRESENT;
    }

    // validate status
    if (!validAttendanceStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validAttendanceStatuses.join(
          ', '
        )}`,
      });
    }

    const record = await prisma.attendance.create({
      data: {
        studentUserId,
        sessionId,
        status,
      },
      include: {
        student: true,
        session: {
          include: { course: true },
        },
      },
    });

    res.json(record);
  } catch (e) {
    console.error(e);

    // handle unique constraint (studentUserId, sessionId)
    if (e.code === 'P2002') {
      return res.status(409).json({
        error: 'Student has already checked in for this session',
      });
    }

    res.status(500).json({ error: e.message });
  }
});

// POST /attendance/check-in
// Body: { code, studentId, firstName, lastName, status? }
app.post('/attendance/check-in', async (req, res) => {
  try {
    let { code, studentId, firstName, lastName, status } = req.body;

    code = normalizeCode(code);
    studentId = normalizeStudentId(studentId);
    firstName = typeof firstName === 'string' ? firstName.trim() : '';
    lastName = typeof lastName === 'string' ? lastName.trim() : '';

    if (!code) {
      return res.status(400).json({ error: 'code is required' });
    }

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'firstName and lastName are required' });
    }

    if (!status) {
      status = AttendanceStatus.PRESENT;
    }

    if (!validAttendanceStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validAttendanceStatuses.join(', ')}`,
      });
    }

    const session = await prisma.session.findFirst({
      where: {
        ...activeSessionWhere(),
        qToken: code,
      },
      include: {
        course: true,
      },
      orderBy: {
        startsAt: 'desc',
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Invalid or expired check-in code' });
    }

    const lookupEmail = studentIdToEmail(studentId);

    let student = await prisma.user.findUnique({
      where: { email: lookupEmail },
      include: { studentProfile: true },
    });

    if (student && student.role !== UserRole.STUDENT) {
      return res.status(409).json({
        error: 'Student identifier belongs to a non-student account',
      });
    }

    if (!student) {
      student = await prisma.user.create({
        data: {
          email: lookupEmail,
          firstName: firstName || 'Student',
          lastName: lastName || 'User',
          role: UserRole.STUDENT,
          password: hashPassword(`checkin_${Math.random().toString(36).slice(2, 12)}`),
          studentProfile: {
            create: {},
          },
        },
        include: { studentProfile: true },
      });
    } else {
      const shouldUpdateNames =
        (firstName && firstName !== student.firstName) ||
        (lastName && lastName !== student.lastName);

      const needsProfile = !student.studentProfile;

      if (shouldUpdateNames || needsProfile) {
        student = await prisma.user.update({
          where: { id: student.id },
          data: {
            ...(firstName ? { firstName } : {}),
            ...(lastName ? { lastName } : {}),
            ...(needsProfile ? { studentProfile: { create: {} } } : {}),
          },
          include: { studentProfile: true },
        });
      }
    }

    const record = await prisma.attendance.create({
      data: {
        studentUserId: student.id,
        sessionId: session.id,
        status,
      },
      include: {
        student: true,
        session: {
          include: { course: true },
        },
      },
    });

    res.json(decorateAttendanceRecord(record));
  } catch (e) {
    console.error(e);

    if (e.code === 'P2002') {
      return res.status(409).json({
        error: 'Student has already checked in for this session',
      });
    }

    res.status(500).json({ error: e.message });
  }
});

// Server Listen 
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`API running on port ${PORT}`);
});
