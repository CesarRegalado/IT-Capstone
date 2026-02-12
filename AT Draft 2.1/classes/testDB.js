import {User, Student, Instructor, Course, Session, Attendance, qrcode} from "./index.js";
export const testDB = {
    usersArr: [
        new Student(
            'user_001',
            'NotReal',
            'Student',
            'notRealStudent@email.com',
            'student',
            '565968221', // This is a plain text password for testing purposes, should be hashed in production
            ['MATH101', 'PHYS102', 'CS101']
        ),
        new Instructor(
            'user_002',
            'Tom',
            'Brady',
            'tombrady@email.com',
            'instructor',
            '565968221', // This is a plain text password for testing purposes, should be hashed in production
            ['MATH101', 'PHYS102']
        ),
        new Instructor(
            'user_003',
            'Peyton',
            'Manning',
            'peytonmanning@email.com',
            'instructor',
            '565968221', // This is a plain text password for testing purposes, should be hashed in production
            ['CS101']
        )
    ],
    coursesArr: [
        new Course('MATH101', 'Calculus I', 'M', '10:00', 'user_002'),
        new Course('PHYS102', 'Physics I', 'T.Th', '11:00', 'user_002'),
        new Course('CS101', 'Introduction to Computer Science', 'M,W,F', '09:00', 'user_003')
    ],
    sessionsArr: [
        new Session('session_001', 'MATH101', '2025-10-17T15:00:00Z', 'Monday', '10:00'),
        new Session('session_002', 'PHYS102', '2025-10-18T16:00:00Z', 'Tuesday', '11:00'),
        new Session('session_003', 'CS101', '2025-10-17T14:00:00Z', 'Monday', '09:00'),
        new Session('session_004', 'PHYS102', '2025-10-20T16:00:00Z', 'Thursday', '11:00'),
        new Session('session_005', 'CS101', '2025-10-19T14:00:00Z', 'Wednesday', '09:00'),
        new Session('session_006', 'CS101', '2025-10-21T14:00:00Z', 'Friday', '09:00')
    ],  
    qrcodesArr: [
        new qrcode('math101_20251017_randomCode', 'session_001'),
        new qrcode('phys102_20251018_randomCode', 'session_002'),
        new qrcode('cs101_20251017_randomCode', 'session_003'),
        new qrcode('phys102_20251020_randomCode', 'session_004'),
        new qrcode('cs101_20251019_randomCode2', 'session_005'),
        new qrcode('cs101_20251021_randomCode', 'session_006')
    ], 
    attendanceArr: [
        new Attendance('att_001', 'user_001', 'math101_20251017_randomCode', 'PRESENT'),
        new Attendance('att_002', 'user_001', 'phys102_20251018_randomCode', 'ABSENT'),
        new Attendance('att_003', 'user_001', 'cs101_20251017_randomCode', 'PRESENT'),
        new Attendance('att_004', 'user_001', 'phys102_20251020_randomCode', 'LATE'),
        new Attendance('att_005', 'user_001', 'cs101_20251019_randomCode2', 'ABSENT'),
        new Attendance('att_006', 'user_001', 'cs101_20251021_randomCode', 'PRESENT')
    ]
};