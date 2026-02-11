// Student Dashboard Functionality
class StudentDashboard {
    constructor() {
        this.currentUser = null;
        this.courses = [];
        this.sessions = [];
        this.attendance = [];
        this.navigationHistory = [];
        this.allCourses = []; // Available courses from instructors
        
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
        this.initializeBrowserNavigation();
        
        // Set initial navigation state
        this.pushNavigationState('checkin');
        
        // Periodically reload active sessions
        setInterval(() => {
            this.loadActiveSessions();
        }, 5000); // Check every 5 seconds
        
        // Update dashboard
        this.updateDashboard();
        
        console.log('StudentDashboard: Ready!');
    }

    initializeBrowserNavigation() {
        // Back button handling
        const backBtn = document.getElementById('back_btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.handleBackButton());
        }

        // Browser back/forward - prevent page exit
        window.addEventListener('popstate', (event) => {
            event.preventDefault();
            if (this.navigationHistory.length > 1) {
                const previous = this.popNavigationState();
                if (previous) {
                    this.switchSection(previous, false);
                }
            } else {
                // Stay on first page instead of exiting
                this.switchSection('checkin', false);
            }
        });

        // Push initial state to prevent back button from exiting
        if (window.history && window.history.pushState) {
            window.history.pushState({ section: 'checkin' }, '', '#checkin');
        }

        // Mobile back button (Android)
        window.addEventListener('beforeunload', () => {
            this.saveNavigationState();
        });

        // Click outside sidebar to close
        document.addEventListener('click', (e) => {
            const sidebar = document.querySelector('.sidebar');
            const hamburgerMenu = document.querySelector('.hamburger_menu');
            const closeSidebar = document.querySelector('.close_sidebar');
            
            if (sidebar && sidebar.classList.contains('expanded') &&
                !sidebar.contains(e.target) && 
                !hamburgerMenu.contains(e.target) &&
                !closeSidebar.contains(e.target)) {
                this.toggleSidebar();
            }
        });
    }

    pushNavigationState(section) {
        this.navigationHistory.push(section);
        this.updateBackButton();
        sessionStorage.setItem('studentNavHistory', JSON.stringify(this.navigationHistory));
    }

    popNavigationState() {
        if (this.navigationHistory.length > 1) {
            this.navigationHistory.pop();
            const previous = this.navigationHistory[this.navigationHistory.length - 1];
            this.updateBackButton();
            sessionStorage.setItem('studentNavHistory', JSON.stringify(this.navigationHistory));
            return previous;
        }
        return null;
    }

    updateBackButton() {
        const backBtn = document.getElementById('back_btn');
        if (backBtn) {
            // Use requestAnimationFrame for immediate visual update
            requestAnimationFrame(() => {
                if (this.navigationHistory.length > 1) {
                    backBtn.classList.remove('hidden');
                } else {
                    backBtn.classList.add('hidden');
                }
            });
        }
    }

    handleBackButton() {
        const previous = this.popNavigationState();
        if (previous) {
            this.switchSection(previous, false);
        }
    }

    saveNavigationState() {
        sessionStorage.setItem('studentNavHistory', JSON.stringify(this.navigationHistory));
    }

    loadTestData() {
        // Use the test data from the main app. TO BE REMOVED
        if (typeof STUDENT_TEST_DATA !== 'undefined') {
            this.currentUser = STUDENT_TEST_DATA.user;
            this.courses = STUDENT_TEST_DATA.courses;
            this.attendance = STUDENT_TEST_DATA.attendance;
            
            // Load active sessions from localStorage (shared with instructor)
            this.loadActiveSessions();
        } else {
            // Fallback to local test data. TEMPORARY
            this.currentUser = {
                id: 'stu_001',
                firstName: 'Undergraduate',
                lastName: 'Student',
                email: 'undergraduate.student@student.edu',
                universityId: 'S12345678'
            };
            this.courses = [];
            this.attendance = [];
            this.sessions = [];
        }
        
        console.log('Loaded:', this.courses.length, 'courses');
    }

    loadActiveSessions() {
        try {
            // Load sessions from localStorage (shared with instructor)
            const sessionsData = localStorage.getItem('attendance_sessions');
            if (sessionsData) {
                const parsedData = JSON.parse(sessionsData);
                // Filter only active sessions
                this.sessions = (parsedData.sessions || []).filter(s => s.status === 'active');
                console.log('Loaded', this.sessions.length, 'active sessions');
            } else {
                this.sessions = [];
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.sessions = [];
        }
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

    switchSection(section, pushToHistory = true) {
        // Update navigation
        document.querySelectorAll('.nav_item').forEach(item => item.classList.remove('active'));
        const navLink = document.querySelector(`.nav_link[href="#${section}"]`);
        if (navLink && navLink.parentElement) {
            navLink.parentElement.classList.add('active');
        }
        
        // Update content
        document.querySelectorAll('.content_section').forEach(section => section.classList.remove('active'));
        const contentSection = document.getElementById(section + '_content');
        if (contentSection) {
            contentSection.classList.add('active');
        }
        
        // Update title
        const sectionTitle = navLink ? navLink.querySelector('span').textContent : 'Dashboard';
        this.updateUIElement('page_title', sectionTitle);
        
        // Navigation history
        if (pushToHistory) {
            this.pushNavigationState(section);
            if (window.history && window.history.pushState) {
                window.history.pushState({ section: section }, '', `#${section}`);
            }
        }
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && sidebar.classList.contains('expanded')) {
                this.toggleSidebar();
            }
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
        const checkinCodeInput = document.getElementById('checkin_code');
        if (checkinCodeInput) {
            checkinCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.submitManualCheckIn();
            });
        }

        // Add course form
        const addCourseForm = document.getElementById('add_course_form');
        if (addCourseForm) {
            addCourseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addCourseByCode();
            });
        }
    }

    setupLogout() {
        document.querySelector('.logout').addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                sessionStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            }
        });
    }

    updateDashboard() {
        this.renderCourses();
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
                
                <!-- Simple Attendance Stats -->
                <div class="class_attendance_simple">
                    <span class="attendance_text">Attendance: ${presentCount}/${totalSessions} (${attendancePercentage}%)</span>
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
        
        // Simulate QR code scan. FOR TESTS ONLY> PLS REMOVE
        setTimeout(() => {
            this.processQRCheckIn('math101_20241015'); // Simulate scanning QR
        }, 2000);
    }

    closeQRScanner() {
        document.getElementById('qr_scanner').classList.add('hidden');
    }

    processQRCheckIn(qrNonce) {
        // Reload sessions to get latest
        this.loadActiveSessions();
        
        const session = this.sessions.find(s => s.qrNonce === qrNonce && s.status === 'active');
        if (session) {
            this.closeQRScanner();
            this.recordAttendance(session, 'PRESENT');
            
            const course = this.courses.find(c => c.id === session.courseId);
            const courseName = course ? course.title : session.courseTitle || 'class';
            
            document.getElementById('success_message').textContent = 
                `Successfully checked in to ${courseName}!`;
            this.showSuccessMessage();
            
            // Navigate to the course details after check-in
            setTimeout(() => {
                this.closeSuccessMessage();
                this.viewCourseDetails(session.courseId);
            }, 2500);
        } else {
            alert('Invalid QR code or session has ended. Please try again.');
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
        const code = document.getElementById('checkin_code').value.trim().toUpperCase();
        if (!code) {
            alert('Please enter a check-in code');
            return;
        }

        console.log('Checking in with code:', code);
        
        // Reload sessions to get latest
        this.loadActiveSessions();
        
        console.log('Active sessions:', this.sessions);
        
        // Try to find active session by check-in code
        const session = this.sessions.find(s => s.classCode === code && s.status === 'active');
        
        if (session) {
            console.log('Found session:', session);
            
            this.closeManualCheckIn();
            this.recordAttendance(session, 'PRESENT');
            
            const course = this.courses.find(c => c.id === session.courseId);
            const courseName = course ? course.title : session.courseTitle || 'class';
            
            console.log('Showing success message for:', courseName);
            
            document.getElementById('success_message').textContent = 
                `Successfully checked in to ${courseName}!`;
            this.showSuccessMessage();
            
            console.log('Success message shown, setting timeout for redirect');
            
            // Navigate to the course details after check-in
            setTimeout(() => {
                console.log('Timeout fired, closing success and navigating');
                this.closeSuccessMessage();
                this.viewCourseDetails(session.courseId);
            }, 2500);
        } else {
            console.log('Session not found');
            alert('Invalid or expired check-in code. Please try again or scan the QR code.');
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
        // Don't auto-close here, let the caller handle it
    }

    closeSuccessMessage() {
        const successElement = document.getElementById('checkin_success');
        if (successElement) {
            successElement.classList.add('hidden');
        }
    }

    checkInToCourse(courseId) {
        // Reload active sessions to get latest data
        this.loadActiveSessions();
        
        // Navigate to check-in page
        this.switchSection('checkin');
    }

    viewCourseDetails(courseId) {
        console.log('viewCourseDetails called with courseId:', courseId);
        
        // Store the selected course
        this.selectedCourseId = courseId;
        
        // Navigate to attendance page
        console.log('Switching to attendance section');
        this.switchSection('attendance');
        
        // Filter and render attendance for this specific course
        console.log('Rendering course attendance details');
        this.renderCourseAttendanceDetails(courseId);
    }

    renderCourseAttendanceDetails(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;

        const container = document.getElementById('attendance_list');
        
        // Filter attendance for this course only
        const courseAttendance = this.attendance.filter(a => 
            a.session.course.code === course.code
        );

        if (courseAttendance.length === 0) {
            container.innerHTML = `
                <div class="course_attendance_header">
                    <h3>${this.escapeHtml(course.title)} (${this.escapeHtml(course.code)})</h3>
                </div>
                <div class="empty_attendance">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No attendance records yet for this course</p>
                </div>
            `;
            return;
        }

        // Calculate stats
        const presentCount = courseAttendance.filter(a => a.status === 'PRESENT').length;
        const lateCount = courseAttendance.filter(a => a.status === 'LATE').length;
        const absentCount = courseAttendance.filter(a => a.status === 'ABSENT').length;
        const totalSessions = courseAttendance.length;
        const attendancePercentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

        container.innerHTML = `
            <div class="course_attendance_header">
                <h3>${this.escapeHtml(course.title)} (${this.escapeHtml(course.code)})</h3>
                <div class="course_attendance_summary">
                    <div class="summary_stat">
                        <span class="stat_number">${attendancePercentage}%</span>
                        <span class="stat_label">Attendance Rate</span>
                    </div>
                    <div class="summary_stat">
                        <span class="stat_number">${presentCount}</span>
                        <span class="stat_label">Present</span>
                    </div>
                    <div class="summary_stat">
                        <span class="stat_number">${lateCount}</span>
                        <span class="stat_label">Late</span>
                    </div>
                    <div class="summary_stat">
                        <span class="stat_number">${absentCount}</span>
                        <span class="stat_label">Absent</span>
                    </div>
                    <div class="summary_stat">
                        <span class="stat_number">${totalSessions}</span>
                        <span class="stat_label">Total Sessions</span>
                    </div>
                </div>
            </div>
            <div class="attendance_class">
                <div class="attendance_dates">
                    ${courseAttendance.map(record => this.createAttendanceDate(record)).join('')}
                </div>
            </div>
        `;
    }

    openAddCourseModal() {
        const modal = document.getElementById('add_course_modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('course_code_input').focus();
        }
    }

    closeAddCourseModal() {
        const modal = document.getElementById('add_course_modal');
        if (modal) {
            modal.classList.add('hidden');
            document.getElementById('add_course_form').reset();
        }
    }

    async addCourseByCode() {
        const courseCode = document.getElementById('course_code_input').value.trim().toUpperCase();
        
        if (!courseCode) {
            alert('Please enter a course code');
            return;
        }

        console.log('Looking for course:', courseCode);

        // Get course from global registry
        const course = this.findCourseInRegistry(courseCode);

        if (course) {
            console.log('Found course:', course);
            
            // Check if already enrolled
            if (this.courses.find(c => c.id === course.id)) {
                alert('You are already enrolled in this course');
                return;
            }

            // Add course to student's courses
            this.courses.push(course);
            
            // Add student to instructor's pending list
            this.addToPendingList(course.id);

            this.closeAddCourseModal();
            this.updateDashboard();
            alert(`Successfully requested to join ${course.title}!\n\nWaiting for instructor approval.\n\nThe instructor will see your request in their "Add/Remove Students" panel.`);
        } else {
            console.log('Course not found in registry');
            const registry = JSON.parse(localStorage.getItem('globalCourseRegistry') || '[]');
            console.log('Available courses:', registry);
            alert('Course not found. Please check the course code and try again.\n\nMake sure the instructor has created the course first.');
        }
    }

    findCourseInRegistry(courseCode) {
        try {
            const registry = JSON.parse(localStorage.getItem('globalCourseRegistry') || '[]');
            console.log('Searching registry for:', courseCode);
            console.log('Registry contents:', registry);
            return registry.find(c => c.code.toUpperCase() === courseCode);
        } catch (error) {
            console.error('Error reading course registry:', error);
            return null;
        }
    }

    addToPendingList(courseId) {
        try {
            // Get pending students from localStorage
            let pendingStudents = JSON.parse(localStorage.getItem('pendingStudents') || '{}');
            
            if (!pendingStudents[courseId]) {
                pendingStudents[courseId] = [];
            }

            // Create student info
            const studentInfo = {
                id: this.currentUser.id || 'student_' + Date.now(),
                universityId: this.currentUser.universityId || 'S' + Date.now(),
                firstName: this.currentUser.firstName,
                lastName: this.currentUser.lastName,
                email: this.currentUser.email,
                requestedAt: new Date().toISOString()
            };

            console.log('Adding student to pending:', studentInfo);

            // Check if already in pending list
            const existingIndex = pendingStudents[courseId].findIndex(s => s.id === studentInfo.id);
            if (existingIndex === -1) {
                pendingStudents[courseId].push(studentInfo);
                localStorage.setItem('pendingStudents', JSON.stringify(pendingStudents));
                console.log('Added to pending list for course:', courseId);
                console.log('Pending students:', pendingStudents);
            } else {
                console.log('Student already in pending list');
            }
        } catch (error) {
            console.error('Error adding to pending list:', error);
        }
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

    showToast(message, duration = 3000) {
        // Create toast if it doesn't exist
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.studentDashboard = new StudentDashboard();
});

// Global functions
function openAddCourseModal() {
    if (window.studentDashboard) {
        window.studentDashboard.openAddCourseModal();
    }
}

function closeAddCourseModal() {
    if (window.studentDashboard) {
        window.studentDashboard.closeAddCourseModal();
    }
}