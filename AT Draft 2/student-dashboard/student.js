// Student Dashboard Functionality
class StudentDashboard {
    constructor() {
        this.currentUser = null;
        this.courses = [];
        this.sessions = [];
        this.attendance = [];
        
        console.log('StudentDashboard: Initializing...');
        this.initializeApp();
    }

    async initializeApp() {
        // Load user from session storage (set during login)
        const userData = sessionStorage.getItem('currentUser');
        
        if (!userData) {
            console.log('No user session found, loading demo data...');
            // For demo purposes, load test data directly
            this.loadTestData();
        } else {
            this.currentUser = JSON.parse(userData);
            // In real app, you'd fetch data from API based on user
            // For now, we'll use test data
            this.loadTestData();
        }
        
        // Update UI
        this.updateUIElement('student_name', this.currentUser.firstName + ' ' + this.currentUser.lastName);
        
        // Initialize components
        this.initializeNavigation();
        this.initializeEventListeners();
        this.setupLogout();
        
        // Update dashboard
        this.updateDashboard();
        
        console.log('StudentDashboard: Ready!');
    }

    loadTestData() {
        // Use the test data from the main app
        if (typeof STUDENT_TEST_DATA !== 'undefined') {
            this.currentUser = STUDENT_TEST_DATA.user;
            this.courses = STUDENT_TEST_DATA.courses;
            this.sessions = STUDENT_TEST_DATA.sessions;
            this.attendance = STUDENT_TEST_DATA.attendance;
        } else {
            // Fallback to local test data
            this.currentUser = {
                firstName: 'Undergraduate',
                lastName: 'Student',
                email: 'undergraduate.student@student.edu'
            };
            this.courses = [
                {
                    id: 'course_001',
                    code: 'MATH101',
                    title: 'Calculus I',
                    semester: 'Fall 2024',
                    faculty: { firstName: 'Sarah', lastName: 'Smith' }
                },
                {
                    id: 'course_002', 
                    code: 'PHYS102',
                    title: 'Physics I',
                    semester: 'Fall 2024',
                    faculty: { firstName: 'Michael', lastName: 'Johnson' }
                }
            ];
            this.attendance = [
                {
                    session: {
                        course: { code: 'MATH101', title: 'Calculus I' },
                        startsAt: '2024-10-15T10:00:00Z'
                    },
                    status: 'PRESENT'
                }
            ];
        }
        
        console.log('Loaded:', this.courses.length, 'courses');
    }

    initializeNavigation() {
        const navLinks = document.querySelectorAll('.nav_link');
        
        navLinks.forEach(link => {
            if (!link.classList.contains('logout')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchSection(link.getAttribute('href').substring(1));
                });
            }
        });
        
        document.querySelector('.hamburger_menu').addEventListener('click', () => this.toggleSidebar());
        document.querySelector('.close_sidebar').addEventListener('click', () => this.toggleSidebar());
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const hamburgerMenu = document.querySelector('.hamburger_menu');
        const closeSidebar = document.querySelector('.close_sidebar');
        
        sidebar.classList.toggle('expanded');
        
        if (sidebar.classList.contains('expanded')) {
            hamburgerMenu.style.display = 'none';
            closeSidebar.style.display = 'block';
        } else {
            hamburgerMenu.style.display = 'block';
            closeSidebar.style.display = 'none';
        }
    }

    switchSection(section) {
        // Update navigation
        document.querySelectorAll('.nav_item').forEach(item => item.classList.remove('active'));
        document.querySelector(`.nav_link[href="#${section}"]`).parentElement.classList.add('active');
        
        // Update content
        document.querySelectorAll('.content_section').forEach(section => section.classList.remove('active'));
        document.getElementById(section + '_content').classList.add('active');
        
        // Update title
        const sectionTitle = document.querySelector(`.nav_link[href="#${section}"] span`).textContent;
        this.updateUIElement('page_title', sectionTitle);
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            this.toggleSidebar();
        }
    }

    initializeEventListeners() {
        // Check-in buttons
        document.getElementById('scan_qr_btn').addEventListener('click', () => this.openQRScanner());
        document.getElementById('close_scanner').addEventListener('click', () => this.closeQRScanner());
        document.getElementById('manual_checkin_btn').addEventListener('click', () => this.openManualCheckIn());
        document.getElementById('close_manual').addEventListener('click', () => this.closeManualCheckIn());
        document.getElementById('submit_manual_checkin').addEventListener('click', () => this.submitManualCheckIn());
        document.getElementById('close_success').addEventListener('click', () => this.closeSuccessMessage());

        // Enter key for manual check-in
        document.getElementById('class_code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitManualCheckIn();
        });
    }

    setupLogout() {
        document.querySelector('.logout').addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                sessionStorage.removeItem('currentUser');
                window.location.href = '../index.html';
            }
        });
    }

    updateDashboard() {
        this.renderCourses();
        this.renderAttendanceOverview();
        this.renderAttendanceDetails();
    }

    renderCourses() {
        const container = document.getElementById('classes_container');
        
        if (this.courses.length === 0) {
            container.innerHTML = `
                <div class="empty_classes">
                    <i class="fas fa-home"></i>
                    <p>No courses enrolled yet</p>
                </div>
            `;
        } else {
            container.innerHTML = this.courses.map(course => this.createCourseCard(course)).join('');
        }
    }

    createCourseCard(course) {
        // Calculate attendance for this course
        const courseAttendance = this.attendance.filter(a => 
            a.session.course.code === course.code
        );
        const presentCount = courseAttendance.filter(a => a.status === 'PRESENT').length;
        const totalSessions = courseAttendance.length;
        const attendancePercentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
        
        const attendanceClass = attendancePercentage >= 90 ? 'excellent' : 
                              attendancePercentage >= 80 ? 'good' : 
                              attendancePercentage >= 70 ? 'warning' : 'poor';
        
        // Find today's session for this course
        const todaySession = this.sessions.find(s => s.courseId === course.id);
        
        return `
            <div class="class_card" data-course-id="${course.id}">
                <div class="class_header">
                    <h3>${this.escapeHtml(course.title)}</h3>
                    <span class="class_code">${this.escapeHtml(course.code)}</span>
                </div>
                <div class="class_info">
                    <p><i class="fas fa-user"></i> Prof. ${this.escapeHtml(course.faculty.lastName)}</p>
                    <p><i class="fas fa-calendar"></i> ${this.escapeHtml(course.semester)}</p>
                    ${todaySession ? `
                        <p><i class="fas fa-clock"></i> Today at ${new Date(todaySession.startsAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    ` : ''}
                </div>
                <div class="attendance_badge attendance_${attendanceClass}">
                    ${attendancePercentage}% Attendance (${presentCount}/${totalSessions})
                </div>
                <div class="class_actions">
                    <button class="btn btn_primary btn_small" onclick="studentDashboard.checkInToCourse('${course.id}')">
                        <i class="fas fa-qrcode"></i>
                        Check In
                    </button>
                    <button class="btn btn_secondary btn_small" onclick="studentDashboard.viewCourseDetails('${course.id}')">
                        <i class="fas fa-chart-bar"></i>
                        Details
                    </button>
                </div>
            </div>
        `;
    }

    renderAttendanceOverview() {
        const present = this.attendance.filter(record => record.status === 'PRESENT').length;
        const absent = this.attendance.filter(record => record.status === 'ABSENT').length;
        const late = this.attendance.filter(record => record.status === 'LATE').length;

        this.updateUIElement('present_count', present.toString());
        this.updateUIElement('absent_count', absent.toString());
        this.updateUIElement('late_count', late.toString());
    }

    renderAttendanceDetails() {
        const container = document.getElementById('attendance_list');
        
        if (this.attendance.length === 0) {
            container.innerHTML = this.createEmptyAttendance();
            return;
        }

        const byCourse = this.groupByCourse(this.attendance);
        container.innerHTML = Object.keys(byCourse).map(courseCode => 
            this.createCourseAttendanceSection(courseCode, byCourse[courseCode])
        ).join('');
    }

    groupByCourse(records) {
        return records.reduce((groups, record) => {
            const courseCode = record.session.course.code;
            if (!groups[courseCode]) {
                groups[courseCode] = [];
            }
            groups[courseCode].push(record);
            return groups;
        }, {});
    }

    createCourseAttendanceSection(courseCode, courseRecords) {
        const course = this.courses.find(c => c.code === courseCode);
        const presentCount = courseRecords.filter(r => r.status === 'PRESENT').length;
        const percentage = Math.round((presentCount / courseRecords.length) * 100);
        const percentageClass = percentage >= 90 ? 'excellent' : percentage >= 80 ? 'good' : percentage >= 70 ? 'warning' : 'poor';
        
        return `
            <div class="attendance_class">
                <div class="class_summary">
                    <h4>${this.escapeHtml(course.title)} (${courseCode})</h4>
                    <span class="attendance_percentage attendance_${percentageClass}">
                        ${percentage}%
                    </span>
                </div>
                <div class="attendance_dates">
                    ${courseRecords.slice(0, 8).map(record => this.createAttendanceDate(record)).join('')}
                    ${courseRecords.length > 8 ? `
                        <div class="more_records" style="text-align: center; padding: 10px; color: #666;">
                            +${courseRecords.length - 8} more records
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    createAttendanceDate(record) {
        const date = new Date(record.session.startsAt);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const statusIcon = {
            'PRESENT': 'fa-check',
            'LATE': 'fa-clock',
            'EXCUSED': 'fa-user-clock',
            'ABSENT': 'fa-times'
        }[record.status];
        
        return `
            <div class="attendance_date ${record.status.toLowerCase()}">
                <span>${formattedDate}</span>
                <span class="status ${record.status.toLowerCase()}">
                    <i class="fas ${statusIcon}"></i>
                    ${record.status.toLowerCase()}
                </span>
            </div>
        `;
    }

    createEmptyAttendance() {
        return `
            <div class="empty_attendance">
                <i class="fas fa-clipboard-list"></i>
                <p>No attendance records yet</p>
            </div>
        `;
    }

    // Check-in functionality
    openQRScanner() {
        document.getElementById('qr_scanner').classList.remove('hidden');
        
        // Simulate QR code scan
        setTimeout(() => {
            this.processQRCheckIn('math101_20241015'); // Simulate scanning MATH101 QR
        }, 2000);
    }

    closeQRScanner() {
        document.getElementById('qr_scanner').classList.add('hidden');
    }

    processQRCheckIn(qrNonce) {
        const session = this.sessions.find(s => s.qrNonce === qrNonce);
        if (session) {
            this.closeQRScanner();
            this.recordAttendance(session, 'PRESENT');
            document.getElementById('success_message').textContent = 
                `Checked in to ${session.course.title}`;
            this.showSuccessMessage();
        } else {
            alert('Invalid QR code. Please try again.');
            this.closeQRScanner();
        }
    }

    openManualCheckIn() {
        document.getElementById('manual_checkin').classList.remove('hidden');
        document.getElementById('class_code').focus();
    }

    closeManualCheckIn() {
        document.getElementById('manual_checkin').classList.add('hidden');
        document.getElementById('class_code').value = '';
    }

    submitManualCheckIn() {
        const code = document.getElementById('class_code').value.trim().toUpperCase();
        if (code) {
            const session = this.sessions.find(s => s.course.code === code);
            if (session) {
                this.closeManualCheckIn();
                this.recordAttendance(session, 'PRESENT');
                document.getElementById('success_message').textContent = 
                    `Checked in to ${session.course.title}`;
                this.showSuccessMessage();
            } else {
                alert('No active session found for this course. Try: MATH101, PHYS102, or CS101');
            }
        } else {
            alert('Please enter a course code');
        }
    }

    recordAttendance(session, status) {
        // Create new attendance record
        const newRecord = {
            id: 'att_' + Date.now(),
            studentId: this.currentUser.id,
            sessionId: session.id,
            status: status,
            checkedInAt: new Date().toISOString(),
            session: {
                course: session.course,
                startsAt: session.startsAt
            }
        };

        // Add to records
        this.attendance.unshift(newRecord);
        
        // Update dashboard
        this.updateDashboard();
        
        console.log(`Recorded ${status} attendance for ${session.course.title}`);
    }

    showSuccessMessage() {
        const successElement = document.getElementById('checkin_success');
        successElement.classList.remove('hidden');
        
        setTimeout(() => {
            this.closeSuccessMessage();
        }, 3000);
    }

    closeSuccessMessage() {
        document.getElementById('checkin_success').classList.add('hidden');
    }

    checkInToCourse(courseId) {
        this.switchSection('checkin');
        
        const course = this.courses.find(c => c.id === courseId);
        setTimeout(() => {
            document.getElementById('success_message').textContent = 
                `Ready to check in for ${course.title}`;
            this.openQRScanner();
        }, 500);
    }

    viewCourseDetails(courseId) {
        this.switchSection('attendance');
    }

    // Utility methods
    updateUIElement(id, content) {
        const element = document.getElementById(id);
        if (element) element.textContent = content;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.studentDashboard = new StudentDashboard();
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(e) {
    const sidebar = document.querySelector('.sidebar');
    const hamburgerMenu = document.querySelector('.hamburger_menu');
    
    if (window.innerWidth <= 768 && 
        sidebar.classList.contains('expanded') &&
        !sidebar.contains(e.target) && 
        !hamburgerMenu.contains(e.target)) {
        window.studentDashboard.toggleSidebar();
    }
});