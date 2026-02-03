// Comprehensive Test Data for Instructor Dashboard
const INSTRUCTOR_TEST_DATA = {
    user: {
        id: 'fac_001',
        email: 'instructor@university.edu',
        firstName: 'John',
        lastName: 'Doe',
        role: 'instructor'
    },
    
    // Courses data
    courses: [
        {
            id: 'course_001',
            code: 'MATH101',
            title: 'Calculus I',
            semester: 'Fall 2024',
            instructorId: 'fac_001',
            schedule: {
                days: ['Monday', 'Wednesday', 'Friday'],
                startTime: '10:00',
                endTime: '11:15',
                location: 'Science Building Room 101'
            }
        },
        {
            id: 'course_002',
            code: 'MATH201',
            title: 'Calculus II',
            semester: 'Fall 2024',
            instructorId: 'fac_001',
            schedule: {
                days: ['Tuesday', 'Thursday'],
                startTime: '13:00',
                endTime: '14:30',
                location: 'Science Building Room 205'
            }
        },
        {
            id: 'course_003',
            code: 'CS101',
            title: 'Introduction to Programming',
            semester: 'Fall 2024',
            instructorId: 'fac_001',
            schedule: {
                days: ['Monday', 'Wednesday'],
                startTime: '14:00',
                endTime: '15:30',
                location: 'Computer Lab 3'
            }
        }
    ],
    
    // Students data
    students: [
        {
            id: 'stu_001',
            universityId: 'S12345678',
            email: 'mary.jane@student.edu',
            firstName: 'Mary',
            lastName: 'Jane',
            courses: ['course_001', 'course_002', 'course_003']
        },
        {
            id: 'stu_002',
            universityId: 'S12345679',
            email: 'will.smith@student.edu',
            firstName: 'Will',
            lastName: 'Smith',
            courses: ['course_001', 'course_003']
        },
        {
            id: 'stu_003',
            universityId: 'S12345680',
            email: 'rick.james@student.edu',
            firstName: 'Rick',
            lastName: 'James',
            courses: ['course_001', 'course_002']
        },
        {
            id: 'stu_004',
            universityId: 'S12345681',
            email: 'stan.marsh@student.edu',
            firstName: 'Stan',
            lastName: 'Marsh',
            courses: ['course_002']
        },
        {
            id: 'stu_005',
            universityId: 'S12345682',
            email: 'david.brown@student.edu',
            firstName: 'David',
            lastName: 'Brown',
            courses: ['course_001', 'course_003']
        },
        {
            id: 'stu_006',
            universityId: 'S12345683',
            email: 'peter.parker@student.edu',
            firstName: 'Peter',
            lastName: 'Parker',
            courses: ['course_003']
        }
    ],
    
    // Sessions data with actual attendance records
    sessions: [
        // MATH101 Sessions
        {
            id: 'sess_001',
            courseId: 'course_001',
            startsAt: '2024-10-15T10:00:00Z',
            endsAt: '2024-10-15T11:15:00Z',
            classCode: 'MATH15OCT',
            qrNonce: 'qr_math101_001',
            attendance: [
                { studentId: 'stu_001', status: 'PRESENT', checkedInAt: '2024-10-15T10:02:00Z' },
                { studentId: 'stu_002', status: 'PRESENT', checkedInAt: '2024-10-15T10:04:00Z' },
                { studentId: 'stu_003', status: 'LATE', checkedInAt: '2024-10-15T10:20:00Z' },
                { studentId: 'stu_005', status: 'ABSENT', checkedInAt: null }
            ]
        },
        {
            id: 'sess_002',
            courseId: 'course_001',
            startsAt: '2024-10-17T10:00:00Z',
            endsAt: '2024-10-17T11:15:00Z',
            classCode: 'MATH17OCT',
            qrNonce: 'qr_math101_002',
            attendance: [
                { studentId: 'stu_001', status: 'PRESENT', checkedInAt: '2024-10-17T10:01:00Z' },
                { studentId: 'stu_002', status: 'ABSENT', checkedInAt: null },
                { studentId: 'stu_003', status: 'PRESENT', checkedInAt: '2024-10-17T10:05:00Z' },
                { studentId: 'stu_005', status: 'PRESENT', checkedInAt: '2024-10-17T10:03:00Z' }
            ]
        },
        
        // MATH201 Sessions
        {
            id: 'sess_003',
            courseId: 'course_002',
            startsAt: '2024-10-16T13:00:00Z',
            endsAt: '2024-10-16T14:30:00Z',
            classCode: 'CALC16OCT',
            qrNonce: 'qr_math201_001',
            attendance: [
                { studentId: 'stu_001', status: 'PRESENT', checkedInAt: '2024-10-16T12:58:00Z' },
                { studentId: 'stu_003', status: 'PRESENT', checkedInAt: '2024-10-16T13:01:00Z' },
                { studentId: 'stu_004', status: 'LATE', checkedInAt: '2024-10-16T13:25:00Z' }
            ]
        },
        
        // CS101 Sessions
        {
            id: 'sess_004',
            courseId: 'course_003',
            startsAt: '2024-10-14T14:00:00Z',
            endsAt: '2024-10-14T15:30:00Z',
            classCode: 'CS14OCT',
            qrNonce: 'qr_cs101_001',
            attendance: [
                { studentId: 'stu_001', status: 'PRESENT', checkedInAt: '2024-10-14T13:55:00Z' },
                { studentId: 'stu_002', status: 'PRESENT', checkedInAt: '2024-10-14T14:02:00Z' },
                { studentId: 'stu_005', status: 'ABSENT', checkedInAt: null },
                { studentId: 'stu_006', status: 'PRESENT', checkedInAt: '2024-10-14T14:03:00Z' }
            ]
        }
    ]
};

// Make it globally available
window.INSTRUCTOR_TEST_DATA = INSTRUCTOR_TEST_DATA;