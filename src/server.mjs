import express from 'express';
import cors from 'cors';
import { PrismaClient, AttendanceStatus, UserRole } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// ---------- Middleware ----------
app.use(express.json());

app.use(
  cors({
    origin: [
      'http://localhost:3000', //  local dev
      // 'https://your-amplify-url.amazonaws.com', // <-- replace with your real Amplify URL if we go there
    ],
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
    res.json(students);
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

    res.json(student);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// COURSES / SESSIONS 

// GET /courses - 
app.get('/courses', async (_req, res) => {
  try {
    const courses = await prisma.course.findMany({
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

    res.json(attendance);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ATTENDANCE CHECK-IN 

// helper to validate status against AttendanceStatus enum
const validAttendanceStatuses = Object.values(AttendanceStatus);

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

// Server Listen 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
