// Test Data for Student Login
const STUDENT_TEST_DATA = {
    user: {
        id: 'stu_001',
        universityId: 'S12345678',
        email: 'undergraduate.student@student.edu',
        firstName: 'Undergraduate',
        lastName: 'Student',
        role: 'student'
    },
    
    courses: [
        {
            id: 'course_001',
            code: 'MATH101',
            title: 'Calculus I',
            semester: 'Fall 2024',
            facultyId: 'fac_001',
            faculty: {
                firstName: 'Sarah',
                lastName: 'Smith'
            }
        },
        {
            id: 'course_002',
            code: 'PHYS102',
            title: 'Physics I',
            semester: 'Fall 2024',
            facultyId: 'fac_002',
            faculty: {
                firstName: 'Michael',
                lastName: 'Johnson'
            }
        },
        {
            id: 'course_003',
            code: 'CS101',
            title: 'Introduction to Computer Science',
            semester: 'Fall 2024',
            facultyId: 'fac_003',
            faculty: {
                firstName: 'Emily',
                lastName: 'Davis'
            }
        }
    ],
    
    sessions: [
        {
            id: 'sess_001',
            courseId: 'course_001',
            startsAt: '2024-10-15T10:00:00Z',
            endsAt: '2024-10-15T11:15:00Z',
            qrNonce: 'math101_20241015',
            qrExpiresAt: '2024-10-15T10:15:00Z',
            course: {
                code: 'MATH101',
                title: 'Calculus I'
            }
        },
        {
            id: 'sess_002',
            courseId: 'course_003',
            startsAt: '2024-10-15T15:00:00Z',
            endsAt: '2024-10-15T16:15:00Z',
            qrNonce: 'cs101_20241015',
            qrExpiresAt: '2024-10-15T15:15:00Z',
            course: {
                code: 'CS101',
                title: 'Introduction to Computer Science'
            }
        }
    ],
    
    attendance: [
        {
            id: 'att_001',
            studentId: 'stu_001',
            sessionId: 'sess_001',
            status: 'PRESENT',
            checkedInAt: '2024-10-15T10:05:00Z',
            session: {
                course: {
                    code: 'MATH101',
                    title: 'Calculus I'
                },
                startsAt: '2024-10-15T10:00:00Z'
            }
        },
        {
            id: 'att_002',
            studentId: 'stu_001',
            sessionId: 'sess_003',
            status: 'ABSENT',
            checkedInAt: null,
            session: {
                course: {
                    code: 'MATH101',
                    title: 'Calculus I'
                },
                startsAt: '2024-10-14T10:00:00Z'
            }
        },
        {
            id: 'att_003',
            studentId: 'stu_001',
            sessionId: 'sess_004',
            status: 'PRESENT',
            checkedInAt: '2024-10-13T14:00:00Z',
            session: {
                course: {
                    code: 'PHYS102',
                    title: 'Physics I'
                },
                startsAt: '2024-10-13T14:00:00Z'
            }
        }
    ]
};

// Initialize USER_DATABASE after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Ensure USER_DATABASE exists
    if (typeof window.USER_DATABASE === 'undefined') {
        window.USER_DATABASE = {
            students: new Map(),
            instructors: new Map()
        };
    }
    
    // Add test student
    window.USER_DATABASE.students.set('undergraduate.student@student.edu', {
        firstName: 'Undergraduate',
        lastName: 'Student',
        email: 'undergraduate.student@student.edu',
        role: 'student',
        password: AuthUtils.hashPassword('password123'),
        createdAt: new Date().toISOString()
    });
    
    console.log('Test student added to database');
});