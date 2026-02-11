// Instructor Dashboard Functionality
class InstructorDashboard {
    constructor() {
        console.log('InstructorDashboard: Initializing...');

        this.currentUser = null;
        this.courses = [];
        this.students = [];
        this.attendance = [];
        this.sessions = [];
        this.activeSession = null;
        this.currentCourse = null;
        this.currentDetailedCourse = null;
        this.currentDetailedSession = null;
        this.studentAttendance = new Map();
        this.sessionInterval = null;
        this.editingReport = null;
        this.editingSession = null;
        this.currentSection = 'courses';
        this.projectorWindow = null;
        this.navigationHistory = [];
        this.pendingStudents = new Map(); // courseId -> array of pending students
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            // Load user from session storage
            const userData = sessionStorage.getItem('currentInstructor');
            
            if (!userData) {
                console.log('No instructor session found'); //loads test data for now
                await this.loadTestData();
            } else {
                this.currentUser = JSON.parse(userData);
                await this.loadTestData();
            }
            
            // Update UI
            this.updateUIElement('instructor_name', this.currentUser.firstName + ' ' + this.currentUser.lastName);
            this.updateUIElement('user_avatar', this.currentUser.firstName[0] + this.currentUser.lastName[0]);
            
            // Initialize components
            this.initializeNavigation();
            this.initializeEventListeners();
            this.setupLogout();
            this.initializeEnhancedStyles();
            
            // Message listener for session window (check-in screen)
            window.addEventListener('message', (event) => {
                console.log('Received message:', event.data);
                if (event.data && event.data.action === 'endSessionFromProjector') {
                    if (this.activeSession) {
                        this.endSession();
                    } else {
                        console.warn('endSessionFromProjector received but no active session');
                        this.showToast('No active session to end');
                    }
                }
            });

            // Initialize browser navigation handling
            this.initializeBrowserNavigation();
            
            // Initialize back button
            const backBtn = document.getElementById('back_btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => this.handleBackButton());
            }
            
            // Set initial navigation state
            this.pushNavigationState('courses', {});
            
            // Restore app state
            this.restoreAppState();
            
            console.log('InstructorDashboard: Ready!');
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showToast('Error initializing application');
        }
    }

    initializeBrowserNavigation() {
        // Cross-browser popstate handling - prevent page exit
        window.addEventListener('popstate', (event) => {
            event.preventDefault();
            if (this.navigationHistory.length > 1) {
                const previous = this.popNavigationState();
                if (previous) {
                    this.switchSection(previous.section, false);
                    if (previous.data.courseId) {
                        this.currentCourse = this.courses.find(c => c.id === previous.data.courseId);
                    }
                }
            } else {
                // Stay on first page instead of exiting
                this.switchSection('courses', false);
            }
        });

        // Push initial state to prevent back button from exiting
        if (window.history && window.history.pushState) {
            window.history.pushState({ section: 'courses' }, '', '#courses');
        }

        window.addEventListener('beforeunload', (event) => {
            this.saveAppState();
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
                const sidebarExpanded = sidebar.classList.contains('expanded');
                if (sidebarExpanded) {
                    this.toggleSidebar();
                }
            }
        });
    }

    saveAppState() {
        const state = {
            section: this.currentSection,
            currentCourse: this.currentCourse ? this.currentCourse.id : null,
            currentDetailedCourse: this.currentDetailedCourse,
            courses: this.courses,
            sessions: this.sessions,
            timestamp: Date.now()
        };
        
        try {
            sessionStorage.setItem('instructorAppState', JSON.stringify(state));
        } catch (error) {
            console.warn('Could not save app state:', error);
        }
    }

    restoreAppState() {
        try {
            const savedState = sessionStorage.getItem('instructorAppState');
            if (savedState) {
                const state = JSON.parse(savedState);
                
                if (state.courses) this.courses = state.courses;
                if (state.sessions) this.sessions = state.sessions;
                
                if (state.section) {
                    this.currentSection = state.section;
                    this.currentDetailedCourse = state.currentDetailedCourse;
                    
                    if (state.currentCourse) {
                        this.currentCourse = this.courses.find(c => c.id === state.currentCourse);
                    }
                    
                    this.switchSection(this.currentSection, false);
                } else {
                    this.updateDashboard();
                }
                
                sessionStorage.removeItem('instructorAppState');
            } else {
                const savedSection = sessionStorage.getItem('currentSection');
                if (savedSection) {
                    this.currentSection = savedSection;
                    this.switchSection(this.currentSection, false);
                } else {
                    this.updateDashboard();
                }
            }
        } catch (error) {
            console.warn('Could not restore app state:', error);
            this.updateDashboard();
        }
    }

    //TEST DATA ONLY. PLS REMOVE
    async loadTestData() {
        console.log('Loading test data...');
        
        // Load sessions from storage
        this.loadSessionsFromStorage();
        
        // Check if test data is available
        if (typeof window.INSTRUCTOR_TEST_DATA !== 'undefined' && window.INSTRUCTOR_TEST_DATA.user) {
            console.log('INSTRUCTOR_TEST_DATA found');
            this.currentUser = window.INSTRUCTOR_TEST_DATA.user;
            this.courses = window.INSTRUCTOR_TEST_DATA.courses || [];
            
            // Load test students ONLY if we don't have any students yet
            // This preserves students added via approval
            if (!this.students || this.students.length === 0) {
                this.students = window.INSTRUCTOR_TEST_DATA.students || [];
                console.log('Loaded test students:', this.students.length);
            } else {
                console.log('Keeping existing students (from approvals):', this.students.length);
            }
            
            // Add existing courses to global registry
            this.courses.forEach(course => {
                if (!course.faculty) {
                    course.faculty = {
                        firstName: this.currentUser.firstName,
                        lastName: this.currentUser.lastName
                    };
                }
                this.addToGlobalCourseRegistry(course);
            });
            
            // Only use test data sessions if we don't have any in storage
            if (this.sessions.length === 0 && window.INSTRUCTOR_TEST_DATA.sessions) {
                this.sessions = window.INSTRUCTOR_TEST_DATA.sessions;
                this.saveSessionsToStorage();
            }
        } else {
            console.warn('INSTRUCTOR_TEST_DATA not found or incomplete');
            this.createMinimalFallbackData();
        }
        
        this.ensureStudentCourseEnrollments();
    }

    createMinimalFallbackData() {
        // Only create absolutely essential data if test data is missing
        this.currentUser = {
            id: 'instructor_1',
            firstName: 'Professor',
            lastName: 'Instructor',
            email: 'instructor@university.edu'
        };
        
        // Empty arrays - user will need to add courses
        this.courses = [];
        this.students = [];
        this.sessions = [];
        
        console.warn('Using minimal fallback data - please ensure instructor_test_data.js is loaded');
    }

    ensureStudentCourseEnrollments() {
        // Only process if we have both courses and students
        if (this.courses.length > 0 && this.students.length > 0) {
            let needsFix = false;
            
            this.students.forEach(student => {
                if (!student.courses || student.courses.length === 0) {
                    // Enroll student in first course if no courses assigned
                    student.courses = [this.courses[0].id];
                    needsFix = true;
                }
            });
            
            if (needsFix) {
                console.log('Fixed student course enrollments');
                this.saveAppState();
            }
        }
    }

    initializeNavigation() {
        const navLinks = document.querySelectorAll('.nav_link');
        
        navLinks.forEach(link => {
            if (!link.classList.contains('logout')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = link.getAttribute('href').substring(1);
                    this.switchSection(section);
                });
            }
        });
        
        const hamburgerMenu = document.querySelector('.hamburger_menu');
        const closeSidebar = document.querySelector('.close_sidebar');
        
        if (hamburgerMenu) {
            hamburgerMenu.addEventListener('click', () => this.toggleSidebar());
        }
        
        if (closeSidebar) {
            closeSidebar.addEventListener('click', () => this.toggleSidebar());
        }

        // Handle initial hash for cross-browser compatibility
        const initialHash = window.location.hash.substring(1);
        if (initialHash && initialHash !== 'courses') {
            // Use setTimeout to ensure DOM is fully ready
            setTimeout(() => {
                this.switchSection(initialHash, false);
            }, 100);
        }
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const hamburgerMenu = document.querySelector('.hamburger_menu');
        const closeSidebar = document.querySelector('.close_sidebar');
        
        if (!sidebar || !hamburgerMenu || !closeSidebar) {
            console.warn('Sidebar elements not found');
            return;
        }
        
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
        console.log('Switching to section:', section, 'pushToHistory:', pushToHistory);
        
        this.currentSection = section;
        
        if (pushToHistory) {
            sessionStorage.setItem('currentSection', section);
            this.pushNavigationState(section, { 
                courseId: this.currentCourse ? this.currentCourse.id : null 
            });
        }
        
        // Cross-browser classList handling
        document.querySelectorAll('.nav_item').forEach(item => {
            if (item.classList) {
                item.classList.remove('active');
            }
        });
        
        const navLink = document.querySelector(`.nav_link[href="#${section}"]`);
        if (navLink && navLink.parentElement && navLink.parentElement.classList) {
            navLink.parentElement.classList.add('active');
        }
        
        document.querySelectorAll('.content_section').forEach(section => {
            if (section.classList) {
                section.classList.remove('active');
            }
        });
        
        let targetSection;
        if (section === 'course_details') {
            targetSection = document.getElementById('course_management_content');
        } else {
            targetSection = document.getElementById(section + '_content');
        }
        
        if (targetSection && targetSection.classList) {
            targetSection.classList.add('active');
        } else {
            const fallbackSection = document.getElementById('courses_content');
            if (fallbackSection && fallbackSection.classList) {
                fallbackSection.classList.add('active');
            }
            this.currentSection = 'courses';
        }
        
        let sectionTitle = 'Dashboard';
        if (navLink) {
            const spanElement = navLink.querySelector('span');
            if (spanElement) {
                sectionTitle = spanElement.textContent;
            }
        }
        
        const pageTitle = document.getElementById('page_title');
        if (pageTitle) {
            if (section === 'attendance') {
                pageTitle.style.display = 'none';
            } else {
                pageTitle.style.display = 'block';
                pageTitle.textContent = sectionTitle;
            }
        }
        
        this.loadSectionData(section);
        
        if (pushToHistory && window.history && window.history.pushState) {
            try {
                window.history.pushState({ section: section }, '', `#${section}`);
            } catch (e) {
                console.warn('History API not supported:', e);
            }
        }
        
        // Responsive behavior
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && sidebar.classList.contains('expanded')) {
                this.toggleSidebar();
            }
        }
        
        this.saveAppState();
    }

    loadSectionData(section) {
        switch(section) {
            case 'courses':
                this.renderCourses();
                break;
            case 'attendance':
                this.renderAttendanceReports();
                break;
            case 'course_management':
                if (this.currentCourse || this.currentDetailedCourse) {
                    if (this.currentDetailedCourse) {
                        this.showCourseDetailsView();
                    } else if (this.currentCourse) {
                        this.renderStudentsTable(this.currentCourse.id);
                        const sessionControls = document.getElementById('session_controls');
                        if (sessionControls) {
                            sessionControls.style.display = 'block';
                        }
                    }
                } else {
                    this.showToast('No course selected');
                    this.switchSection('courses');
                }
                break;
            default:
                this.renderCourses();
        }
    }

    initializeEventListeners() {
        const courseForm = document.getElementById('course_form');
        if (courseForm) {
            courseForm.addEventListener('submit', (e) => this.handleCourseSubmit(e));
        }
        
        const closeModal = document.querySelector('.close_modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeCourseModal());
        }
        
        const courseModal = document.getElementById('course_modal');
        if (courseModal) {
            courseModal.addEventListener('click', (e) => {
                if (e.target.id === 'course_modal') {
                    this.closeCourseModal();
                }
            });
        }

        const courseFilter = document.getElementById('course_filter');
        if (courseFilter) {
            courseFilter.addEventListener('change', (e) => {
                this.renderAttendanceReports(e.target.value);
            });
        }

        this.enhanceAccessibility();
    }

    //Accessibility stuff
    enhanceAccessibility() {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    // Touch device detection
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.documentElement.classList.add('touch-device');
    }
        // Prevent double-tap zoom on mobile
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
    }

    closeAllModals() {
        this.closeCourseModal();
        this.closeSessionDetailsModal();
        const editModal = document.getElementById('session_edit_modal');
        if (editModal) editModal.remove();
    }

    setupLogout() {
        const logoutLink = document.querySelector('.logout');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    sessionStorage.removeItem('currentInstructor');
                    sessionStorage.removeItem('currentSection');
                    sessionStorage.removeItem('instructorAppState');
                    window.location.href = '../index.html';
                }
            });
        }
    }

    // Courses stuff
    updateDashboard() {
        this.renderCourses();
    }

    renderCourses() {
        const container = document.getElementById('courses_container');
        const noCourses = document.getElementById('no_courses_message');
        
        if (!container || !noCourses) {
            console.error('Courses container elements not found');
            return;
        }
        
        if (this.courses.length === 0) {
            container.classList.add('hidden');
            noCourses.classList.remove('hidden');
        } else {
            container.classList.remove('hidden');
            noCourses.classList.add('hidden');
            container.innerHTML = this.courses.map(course => this.createCourseCard(course)).join('');
        }

        this.updateCourseFilter();
    }

    updateCourseFilter() {
        const courseFilter = document.getElementById('course_filter');
        if (courseFilter) {
            courseFilter.innerHTML = '<option value="all">All Courses</option>' +
                this.courses.map(course => 
                    `<option value="${course.id}">${this.escapeHtml(course.code)} - ${this.escapeHtml(course.title)}</option>`
                ).join('');
        }
    }

    createCourseCard(course) {
        const studentCount = this.getStudentCountForCourse(course.id);
        
        return `
            <div class="course_card" data-course-id="${course.id}">
                <div class="course_header">
                    <h3>${this.escapeHtml(course.title)}</h3>
                    <span class="course_code">${this.escapeHtml(course.code)}</span>
                </div>
                <div class="course_info">
                    <p><i class="fas fa-users"></i> ${studentCount} students enrolled</p>
                    ${course.schedule ? `
                        <p><i class="fas fa-clock"></i> ${course.schedule.days.join(', ')} ${course.schedule.startTime} - ${course.schedule.endTime}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${course.schedule.location}</p>
                    ` : ''}
                </div>
                <div class="course_actions">
                    <button class="btn btn_primary btn_small" onclick="instructorDashboard.manageCourse('${course.id}')">
                        <i class="fas fa-edit"></i>
                        Manage
                    </button>
                    <button class="btn btn_secondary btn_small" onclick="instructorDashboard.viewDetailedReport('${course.id}')">
                        <i class="fas fa-chart-bar"></i>
                        View Reports
                    </button>
                    <button class="btn btn_danger btn_small" onclick="instructorDashboard.deleteCourse('${course.id}')">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    deleteCourse(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;

        if (confirm(`Are you sure you want to delete "${course.title}" (${course.code})? This action cannot be undone and will remove all sessions and attendance data.`)) {
            this.courses = this.courses.filter(c => c.id !== courseId);
            this.sessions = this.sessions.filter(s => s.courseId !== courseId);
            
            this.students.forEach(student => {
                if (student.courses && student.courses.includes(courseId)) {
                    student.courses = student.courses.filter(cid => cid !== courseId);
                }
            });
            
            // Remove from global registry
            this.removeFromGlobalCourseRegistry(course.code);
            
            // Remove pending students for this course
            this.removePendingStudentsForCourse(courseId);
            
            if (this.currentCourse && this.currentCourse.id === courseId) {
                this.currentCourse = null;
            }
            
            if (this.currentDetailedCourse === courseId) {
                this.currentDetailedCourse = null;
            }
            
            this.renderCourses();
            this.updateCourseFilter();
            this.saveAppState();
            this.saveSessionsToStorage();
            
            this.showToast(`Course "${course.title}" has been deleted`);
            
            if (this.currentSection === 'course_management' || this.currentSection === 'course_details') {
                this.switchSection('courses');
            }
        }
    }

    removeFromGlobalCourseRegistry(courseCode) {
        try {
            let registry = JSON.parse(localStorage.getItem('globalCourseRegistry') || '[]');
            registry = registry.filter(c => c.code !== courseCode);
            localStorage.setItem('globalCourseRegistry', JSON.stringify(registry));
            console.log('Course removed from global registry:', courseCode);
        } catch (error) {
            console.error('Error removing course from registry:', error);
        }
    }

    removePendingStudentsForCourse(courseId) {
        try {
            let allPending = JSON.parse(localStorage.getItem('pendingStudents') || '{}');
            delete allPending[courseId];
            localStorage.setItem('pendingStudents', JSON.stringify(allPending));
            this.pendingStudents.delete(courseId);
        } catch (error) {
            console.error('Error removing pending students:', error);
        }
    }

    manageCourse(courseId) {
        this.currentCourse = this.courses.find(c => c.id === courseId);
        if (this.currentCourse) {
            this.currentDetailedCourse = null;
            this.switchToCourseManagement();
            this.renderStudentsTable(this.currentCourse.id);
            this.hideLiveSessionControls();
            this.saveAppState();
        } else {
            this.showToast('Course not found');
        }
    }

    switchToCourseManagement() {
        if (!this.currentCourse) return;
        
        console.log('Switching to course management for:', this.currentCourse.code);
        
        const sessionControls = document.getElementById('session_controls');
        if (sessionControls) {
            sessionControls.style.display = 'block';
        }

        const titleElement = document.getElementById('course_management_title');
        if (titleElement && this.currentCourse) {
            titleElement.textContent = `${this.currentCourse.code} - ${this.currentCourse.title}`;
        }

        this.showStudentsSection();
        this.renderStudentsTable(this.currentCourse.id);
        
        if (this.activeSession && this.activeSession.courseId === this.currentCourse.id) {
            this.showLiveSessionControls();
            this.enableAttendanceEditing();
        } else {
            this.hideLiveSessionControls();
        }
        
        this.switchSection('course_management');
    }

    showStudentsSection() {
        const studentsSection = document.querySelector('.students_section');
        if (studentsSection) {
            studentsSection.style.display = 'block';
            
            if (this.currentCourse) {
                this.renderStudentsTable(this.currentCourse.id);
            }
        }
    }

    //attendance report stuff
    viewDetailedReport(courseId) {
        this.currentDetailedCourse = courseId;
        const course = this.courses.find(c => c.id === courseId);
        
        if (!course) {
            this.showToast('Course not found');
            return;
        }

        this.switchSection('attendance');
        
        const courseFilter = document.getElementById('course_filter');
        if (courseFilter) {
            courseFilter.value = course.id;
        }
        
        this.renderAttendanceReports(course.id);
        this.saveAppState();
    }

    showCourseDetailsView() {
        if (!this.currentDetailedCourse) {
            if (this.currentCourse) {
                this.currentDetailedCourse = this.currentCourse.id;
            } else {
                this.showToast('No course selected for details view');
                this.switchSection('courses');
                return;
            }
        }
        
        const course = this.courses.find(c => c.id === this.currentDetailedCourse);
        if (!course) {
            this.showToast('Course not found');
            this.switchSection('courses');
            return;
        }

        this.switchSection('attendance');
        
        const courseFilter = document.getElementById('course_filter');
        if (courseFilter) {
            courseFilter.value = course.id;
            this.renderAttendanceReports(course.id);
        }
    }

    renderStudentsTable(courseId) {
        const container = document.getElementById('students_table_body');
        if (!container) {
            console.error('Students table body not found');
            return;
        }
        
        const courseStudents = this.getStudentsForCourse(courseId);
        
        // Update stats
        const totalEnrolled = document.getElementById('total_enrolled');
        if (totalEnrolled) {
            totalEnrolled.textContent = courseStudents.length;
        }

        const avgAttendance = document.getElementById('avg_attendance');
        if (avgAttendance) {
            const avg = this.calculateAverageAttendance(courseId);
            avgAttendance.textContent = avg + '%';
        }
        
        if (courseStudents.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        No students enrolled in this course
                    </td>
                </tr>
            `;
        } else {
            container.innerHTML = courseStudents.map(student => this.createStudentRow(student, courseId)).join('');
            
            // Cross-browser event listener attachment
            container.querySelectorAll('.status_btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const row = e.target.closest('tr');
                    const studentId = row.dataset.studentId;
                    const status = e.target.dataset.status;
                    this.updateStudentAttendance(studentId, this.currentCourse.id, status, row);
                });
            });
            
            console.log(`Rendered ${courseStudents.length} students with attendance controls`);
        }
    }

    createStudentRow(student, courseId) {
        const currentStatus = this.getCurrentAttendanceStatus(student.id, courseId);
        const canEdit = this.activeSession && this.activeSession.courseId === courseId;
        const attendanceRate = this.calculateStudentAttendanceRate(student.id, courseId);
        
        const buttonDisabled = !canEdit;
        const buttonStyle = buttonDisabled ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : 'style="cursor: pointer;"';
        
        return `
            <tr data-student-id="${student.id}">
                <td>${this.escapeHtml(student.universityId)}</td>
                <td>${this.escapeHtml(student.firstName + ' ' + student.lastName)}</td>
                <td>${this.escapeHtml(student.email)}</td>
                <td><span class="attendance_rate">${attendanceRate}%</span></td>
                <td>
                    <span class="current_status ${currentStatus.toLowerCase()}" id="status_${student.id}">
                        ${currentStatus.toLowerCase()}
                    </span>
                </td>
                <td>
                    <div class="attendance_actions">
                        <button class="status_btn ${currentStatus === 'PRESENT' ? 'active' : ''}" 
                                data-status="PRESENT" ${buttonDisabled ? 'disabled' : ''} ${buttonStyle}>
                            Present
                        </button>
                        <button class="status_btn ${currentStatus === 'ABSENT' ? 'active' : ''}" 
                                data-status="ABSENT" ${buttonDisabled ? 'disabled' : ''} ${buttonStyle}>
                            Absent
                        </button>
                        <button class="status_btn ${currentStatus === 'LATE' ? 'active' : ''}" 
                                data-status="LATE" ${buttonDisabled ? 'disabled' : ''} ${buttonStyle}>
                            Late
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    async startSession() {
        if (!this.currentCourse) {
            this.showToast('Please select a course first');
            return;
        }
        
        console.log('Starting session for course:', this.currentCourse.code);
        
        try {
            const { classCode, qrNonce } = this.generateTemporarySessionCodes();
            
            // Create session object with all required data, some of this can change
            const sessionData = {
                id: 'sess_' + Date.now(),
                courseId: this.currentCourse.id,
                courseCode: this.currentCourse.code,
                courseTitle: this.currentCourse.title,
                startsAt: new Date().toISOString(),
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                location: this.currentCourse.schedule?.location || 'Not specified',
                qrNonce: qrNonce,
                classCode: classCode,
                instructorId: this.currentUser.id,
                instructorName: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
                attendance: [],
                status: 'active'
            };
            
            console.log('Session created:', sessionData);
            
            // Save session to database. We need to connect it to this first
            const savedSession = await this.saveSessionToDatabase(sessionData);
            
            if (savedSession) {
                this.activeSession = savedSession;
                
                this.initializeSessionAttendance();
                this.showLiveSessionControls();
                this.enableAttendanceEditing();
                this.showStudentsSection();
                this.startRealTimeUpdates();
                this.openSessionDisplay();
                
                this.showToast(`Session started for ${this.currentCourse.code}`);
            } else {
                throw new Error('Failed to save session to database');
            }
            
        } catch (error) {
            console.error('Error starting session:', error);
            this.showToast('Error starting session. Please try again.');
        }
    }

    //TEMPORARY CLASS CODE GENERATION FOR TESTINNG
    generateTemporarySessionCodes() {
        // Cross-browser random string generation
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let classCode = '';
        for (let i = 0; i < 6; i++) {
            classCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Random string for QR
        const qrNonce = Math.random().toString(36).substring(2, 15) + 
                        Math.random().toString(36).substring(2, 15);
        
        return { classCode, qrNonce };
    }

    async saveSessionToDatabase(sessionData) {
        try {
            console.log('Saving session to database:', sessionData);
            
            // Simulate API call to backend
            // In a real application, this would be a fetch() call to the backend API
            return await this.simulateDatabaseSave(sessionData);
        } catch (error) {
            console.error('Error saving session to database:', error);
            throw error;
        }
    }

    async simulateDatabaseSave(sessionData) {
        // Simulate database save with timeout. TEMPORARY. looks cool though
        return new Promise((resolve) => {
            setTimeout(() => {
                // Add session to sessions array
                this.sessions.push(sessionData);
                
                // Update localStorage for persistence (simulating database)
                this.saveSessionsToStorage();
                
                console.log('Session saved to database:', sessionData.id);
                resolve(sessionData);
            }, 100);
        });
    }

    saveSessionsToStorage() {
        try {
            // Save sessions to localStorage for testing purposes
            // In a real app, this would be handled by the backend
            const sessionsData = {
                sessions: this.sessions,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('attendance_sessions', JSON.stringify(sessionsData));
        } catch (error) {
            console.warn('Could not save sessions to storage:', error);
        }
    }

    loadSessionsFromStorage() {
        try {
            const sessionsData = localStorage.getItem('attendance_sessions');
            if (sessionsData) {
                const parsedData = JSON.parse(sessionsData);
                this.sessions = parsedData.sessions || [];
                console.log(`Loaded ${this.sessions.length} sessions from storage`);
            }
        } catch (error) {
            console.warn('Could not load sessions from storage:', error);
        }
    }

    enableAttendanceEditing() {
        console.log('Enabling attendance editing for session');
        
        this.renderStudentsTable(this.currentCourse.id);
        
        const rows = document.querySelectorAll('#students_table_body tr');
        console.log(`Found ${rows.length} student rows to enable editing`);
        
        rows.forEach(row => {
            const buttons = row.querySelectorAll('.status_btn');
            buttons.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            });
        });
        
        this.updateStudentTableRealTime();
    }

    disableAttendanceEditing() {
        console.log('Disabling attendance editing');
        
        const rows = document.querySelectorAll('#students_table_body tr');
        rows.forEach(row => {
            const buttons = row.querySelectorAll('.status_btn');
            buttons.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.6';
                btn.style.cursor = 'not-allowed';
            });
        });
    }

    showLiveSessionControls() {
        const startBtn = document.getElementById('start_session_btn');
        const liveControls = document.getElementById('live_session_controls');
        
        if (startBtn) startBtn.classList.add('hidden');
        if (liveControls) liveControls.classList.remove('hidden');
        
        this.updateLiveStats();
    }

    hideLiveSessionControls() {
        const startBtn = document.getElementById('start_session_btn');
        const liveControls = document.getElementById('live_session_controls');
        
        if (startBtn) startBtn.classList.remove('hidden');
        if (liveControls) liveControls.classList.add('hidden');
    }

    updateLiveStats() {
        if (!this.activeSession || !this.currentCourse) return;
        
        const courseStudents = this.getStudentsForCourse(this.currentCourse.id);
        let presentCount = 0;
        
        this.studentAttendance.forEach((status) => {
            if (status === 'PRESENT' || status === 'LATE') presentCount++;
        });
        
        const absentCount = courseStudents.length - presentCount;
        
        this.updateUIElement('live_present_count', presentCount.toString());
        this.updateUIElement('live_absent_count', absentCount.toString());
        this.updateUIElement('live_total_count', courseStudents.length.toString());
    }

    openSessionDisplay() {
        if (!this.activeSession || !this.currentCourse) {
            console.error('No active session or course');
            return;
        }
        
        try {
            const url = `session.html?code=${this.activeSession.classCode}&course=${encodeURIComponent(this.currentCourse.title)}`;
            
            console.log('Opening session display with URL:', url);
            
            // Cross-browser window.open with fallback
            const windowFeatures = 'width=1200,height=800,menubar=no,toolbar=no,location=no';
            this.projectorWindow = window.open(url, 'session_display', windowFeatures);
            
            if (this.projectorWindow) {
                this.projectorWindow.focus();
                this.showToast('Projector view opened in new window');
            } else {
                this.showToast('Popup blocked! Please allow popups for this site and try again.');
                console.warn('Popup window was blocked by the browser');
            }
        } catch (error) {
            console.error('Error opening session display:', error);
            this.showToast('Error opening projector view');
        }
    }

    initializeSessionAttendance() {
        const courseStudents = this.getStudentsForCourse(this.currentCourse.id);
        courseStudents.forEach(student => {
            this.studentAttendance.set(student.id, 'ABSENT');
        });
    }

    startRealTimeUpdates() {
        // Cross-browser setInterval
        this.sessionInterval = setInterval(() => {
            this.simulateStudentCheckins();
            this.updateLiveStats();
            this.updateStudentTableRealTime();
        }, 3000);
    }

    stopRealTimeUpdates() {
        if (this.sessionInterval) {
            clearInterval(this.sessionInterval);
            this.sessionInterval = null;
        }
    }

    //check in simulation. TO BE REMOVED
    simulateStudentCheckins() {
        if (!this.activeSession) return;
        
        const courseStudents = this.getStudentsForCourse(this.currentCourse.id);
        const absentStudents = courseStudents.filter(student => 
            this.studentAttendance.get(student.id) === 'ABSENT'
        );
        
        if (absentStudents.length > 0 && Math.random() > 0.7) {
            const randomStudent = absentStudents[Math.floor(Math.random() * absentStudents.length)];
            this.studentAttendance.set(randomStudent.id, 'PRESENT');
            this.updateLiveStats();
            this.showToast(`${randomStudent.firstName} checked in`);
        }
    }

    //real time updates
    updateStudentTableRealTime() {
        if (!this.activeSession || !this.currentCourse) return;
        
        const rows = document.querySelectorAll('#students_table_body tr');
        console.log(`Updating ${rows.length} student rows in real-time`);
        
        rows.forEach(row => {
            const studentId = row.dataset.studentId;
            const currentStatus = this.studentAttendance.get(studentId);
            
            if (currentStatus) {
                const statusElement = row.querySelector('.current_status');
                if (statusElement) {
                    statusElement.textContent = currentStatus.toLowerCase();
                    statusElement.className = `current_status ${currentStatus.toLowerCase()}`;
                }
                
                const buttons = row.querySelectorAll('.status_btn');
                buttons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.status === currentStatus) {
                        btn.classList.add('active');
                    }
                });
            }
        });
    }

    async endSession() {
        console.log('endSession called - checking active session:', this.activeSession);
        
        if (!this.activeSession) {
            console.error('No active session to end');
            this.showToast('No active session found');
            return;
        }
        
        console.log('Ending session:', this.activeSession.id);
        
        try {
            // Update session with end time and final attendance
            this.activeSession.endsAt = new Date().toISOString();
            this.activeSession.status = 'completed';
            
            // Calculate session duration with error handling
            try {
                this.activeSession.duration = this.calculateSessionDuration();
            } catch (error) {
                console.warn('Error calculating duration, using default:', error);
                this.activeSession.duration = 'N/A';
            }
            
            console.log('Session data updated, saving attendance...');
            
            // Save final attendance data
            await this.saveSessionAttendance();
            
            console.log('Attendance saved, updating session in database...');
            
            // Update session in database
            await this.updateSessionInDatabase(this.activeSession);
            
            console.log('Session updated in database, cleaning up...');
            
            // Clean up session state
            this.stopRealTimeUpdates();
            this.disableAttendanceEditing();
            this.hideLiveSessionControls();
            
            // Refresh students table to show final state
            if (this.currentCourse) {
                this.renderStudentsTable(this.currentCourse.id);
            }
            
            // Close projector window if open
            if (this.projectorWindow && !this.projectorWindow.closed) {
                try {
                    this.projectorWindow.postMessage({ action: 'closeProjectorWindow' }, '*');
                    setTimeout(() => {
                        if (!this.projectorWindow.closed) {
                            this.projectorWindow.close();
                        }
                    }, 100);
                } catch (error) {
                    console.warn('Error closing projector window:', error);
                }
            }
            
            this.showToast(`Session ended for ${this.currentCourse?.code || 'course'}. Attendance recorded.`);
            
            // Clear active session
            const endedSession = this.activeSession;
            this.activeSession = null;
            this.studentAttendance.clear();
            
            console.log('Session ended successfully:', endedSession.id);
            
        } catch (error) {
            console.error('Error ending session:', error);
            this.showToast('Error ending session: ' + error.message);
            
            // Try to at least clear the active session to prevent stuck state
            this.activeSession = null;
            this.studentAttendance.clear();
            this.hideLiveSessionControls();
        }
    }

    calculateSessionDuration() {
        try {
            if (!this.activeSession.startsAt || !this.activeSession.endsAt) return 'N/A';
            
            const start = new Date(this.activeSession.startsAt);
            const end = new Date(this.activeSession.endsAt);
            const durationMs = end - start;
            
            const minutes = Math.floor(durationMs / 60000);
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            
            if (hours > 0) {
                return `${hours}h ${remainingMinutes}m`;
            } else {
                return `${minutes}m`;
            }
        } catch (error) {
            console.warn('Error calculating session duration:', error);
            return 'N/A';
        }
    }

    async saveSessionAttendance() {
        if (!this.activeSession) return;
        
        const attendanceRecords = [];
        const courseStudents = this.getStudentsForCourse(this.activeSession.courseId);
        
        // Create attendance records for all students
        courseStudents.forEach(student => {
            const status = this.studentAttendance.get(student.id) || 'ABSENT';
            const record = {
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`,
                universityId: student.universityId,
                email: student.email,
                status: status,
                checkedInAt: status !== 'ABSENT' ? new Date().toISOString() : null,
                sessionId: this.activeSession.id,
                recordedAt: new Date().toISOString()
            };
            attendanceRecords.push(record);
        });
        
        this.activeSession.attendance = attendanceRecords;
        
        console.log(`Saved ${attendanceRecords.length} attendance records for session ${this.activeSession.id}`);
        
        // Update attendance in the database
        await this.updateSessionInDatabase(this.activeSession);
    }

    async updateSessionInDatabase(updatedSession) {
        try {
            // Find and update the session in the sessions array
            const sessionIndex = this.sessions.findIndex(s => s.id === updatedSession.id);
            if (sessionIndex !== -1) {
                this.sessions[sessionIndex] = updatedSession;
                
                // Update localStorage
                this.saveSessionsToStorage();
                
                console.log('Session updated in database:', updatedSession.id);
                
                // Refresh attendance reports if we're on that page
                if (this.currentSection === 'attendance') {
                    this.renderAttendanceReports();
                }
            }
        } catch (error) {
            console.error('Error updating session in database:', error);
            throw error;
        }
    }

    updateStudentAttendance(studentId, courseId, status, row = null) {
        console.log(`Updating attendance for student ${studentId} to ${status}`);
        
        if (this.activeSession && this.activeSession.courseId === courseId) {
            this.studentAttendance.set(studentId, status);
            this.updateLiveStats();
        }
        
        if (row) {
            const statusElement = row.querySelector('.current_status');
            if (statusElement) {
                statusElement.textContent = status.toLowerCase();
                statusElement.className = `current_status ${status.toLowerCase()}`;
            }
            
            row.querySelectorAll('.status_btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.status === status) {
                    btn.classList.add('active');
                }
            });
        }
        
        const student = this.students.find(s => s.id === studentId);
        if (student) {
            this.showToast(`Marked ${student.firstName} ${student.lastName} as ${status.toLowerCase()}`);
        }
    }

    renderAttendanceReports(courseFilter = 'all') {
        const container = document.getElementById('detailed_reports');
        if (!container) {
            console.error('Detailed reports container not found');
            return;
        }
        
        let coursesToShow = this.courses;
        if (courseFilter !== 'all') {
            coursesToShow = this.courses.filter(c => c.id === courseFilter);
        }
        
        if (coursesToShow.length === 0) {
            container.innerHTML = this.createEmptyReports();
            return;
        }

        container.innerHTML = coursesToShow.map(course => this.createCourseReport(course)).join('');
    }

    createCourseReport(course) {
        const courseSessions = this.sessions.filter(s => s.courseId === course.id);
        const studentCount = this.getStudentCountForCourse(course.id);
        
        // Sort sessions by date (newest first)
        const sortedSessions = courseSessions.sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt));
        
        // Get sessions to display (first 3, option to view more after 3)
        const sessionsToShow = sortedSessions.slice(0, 3);
        const hasMoreSessions = sortedSessions.length > 3;

        return `
            <div class="course_report" data-course-id="${course.id}">
                <div class="report_header">
                    <div class="report_course_info">
                        <h3>${this.escapeHtml(course.title)} (${this.escapeHtml(course.code)})</h3>
                        <div class="course_details">
                            <span><i class="fas fa-calendar"></i> ${course.semester}</span>
                            <span><i class="fas fa-users"></i> ${studentCount} Students</span>
                            ${sortedSessions.length > 0 ? `
                                <span><i class="fas fa-chart-line"></i> ${this.calculateAverageAttendance(course.id)}% Avg Attendance</span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="report_actions">
                        <button class="btn btn_secondary btn_small" onclick="instructorDashboard.exportCourseReport('${course.id}', 'csv')">
                            <i class="fas fa-download"></i>
                            Export Course
                        </button>
                    </div>
                </div>
                <div class="session_reports">
                    ${sessionsToShow.map(session => this.createSessionReport(session)).join('')}
                    ${hasMoreSessions ? `
                        <div class="show_more_sessions" onclick="instructorDashboard.toggleAllSessions('${course.id}')">
                            <button class="btn btn_outline btn_small">
                                <i class="fas fa-chevron-down"></i>
                                Show All Sessions
                            </button>
                        </div>
                        <div class="all_sessions hidden" id="all_sessions_${course.id}">
                            ${sortedSessions.slice(3).map(session => this.createSessionReport(session)).join('')}
                        </div>
                    ` : ''}
                    ${courseSessions.length === 0 ? `
                        <div class="no_sessions">
                            <i class="fas fa-calendar-times"></i>
                            <p>No sessions recorded for this course</p>
                            <p class="no_sessions_hint">Start a session from the Course Management page to begin tracking attendance</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    calculateAverageAttendance(courseId) {
        const courseSessions = this.sessions.filter(s => s.courseId === courseId);
        const studentCount = this.getStudentCountForCourse(courseId);
        
        if (courseSessions.length === 0 || studentCount === 0) return 0;
        
        let totalAttendance = 0;
        let sessionsWithAttendance = 0;
        
        courseSessions.forEach(session => {
            if (session.attendance && session.attendance.length > 0) {
                const presentCount = session.attendance.filter(a => a.status !== 'ABSENT').length;
                const attendanceRate = studentCount > 0 ? (presentCount / studentCount) * 100 : 0;
                totalAttendance += attendanceRate;
                sessionsWithAttendance++;
            }
        });
        
        return sessionsWithAttendance > 0 ? Math.round(totalAttendance / sessionsWithAttendance) : 0;
    }

    createSessionReport(session) {
        const sessionDate = new Date(session.startsAt).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const sessionTime = new Date(session.startsAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const presentCount = session.attendance ? session.attendance.filter(a => a.status !== 'ABSENT').length : 0;
        const totalStudents = this.getStudentCountForCourse(session.courseId);
        const course = this.courses.find(c => c.id === session.courseId);
        
        // Get status
        const statusBadge = session.status === 'active' ? 
            '<span class="session_status active">Live</span>' : '';
        
        return `
            <div class="session_report" data-session-id="${session.id}">
                <div class="session_info">
                    <div class="session_details">
                        <h4>${sessionDate} at ${sessionTime}</h4>
                        <div class="session_meta">
                            <span class="session_location"><i class="fas fa-map-marker-alt"></i> ${course?.schedule?.location || 'N/A'}</span>
                            ${statusBadge}
                        </div>
                    </div>
                    <div class="session_actions">
                        <span class="session_stats_badge">${presentCount}/${totalStudents} present</span>
                        <button class="btn btn_primary btn_small" onclick="instructorDashboard.viewSessionDetailsModal('${session.id}')">
                            <i class="fas fa-eye"></i>
                            View Details
                        </button>
                        <button class="btn btn_outline btn_small" onclick="instructorDashboard.exportSessionReport('${session.id}', 'csv')">
                            <i class="fas fa-download"></i>
                            Export
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    toggleAllSessions(courseId) {
        const allSessionsElement = document.getElementById(`all_sessions_${courseId}`);
        const showMoreButton = document.querySelector(`[onclick="instructorDashboard.toggleAllSessions('${courseId}')"]`);
        
        if (allSessionsElement && showMoreButton) {
            allSessionsElement.classList.toggle('hidden');
            
            if (allSessionsElement.classList.contains('hidden')) {
                showMoreButton.innerHTML = `
                    <button class="btn btn_outline btn_small">
                        <i class="fas fa-chevron-down"></i>
                        Show All Sessions
                    </button>
                `;
            } else {
                showMoreButton.innerHTML = `
                    <button class="btn btn_outline btn_small">
                        <i class="fas fa-chevron-up"></i>
                        Show Less
                    </button>
                `;
            }
        }
    }

    createEmptyReports() {
        return `
            <div class="no_reports">
                <div class="no_reports_icon">
                    <i class="fas fa-chart-bar"></i>
                </div>
                <h3>No Reports Available</h3>
                <p>Start sessions and record attendance to generate reports.</p>
            </div>
        `;
    }

    viewSessionDetailsModal(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            this.showToast('Session not found');
            return;
        }

        const course = this.courses.find(c => c.id === session.courseId);
        if (!course) {
            this.showToast('Course not found');
            return;
        }

        this.showSessionDetailsModal(session, course);
    }

    showSessionDetailsModal(session, course) {
        const sessionDate = new Date(session.startsAt).toLocaleDateString();
        const sessionTime = new Date(session.startsAt).toLocaleTimeString();
        const presentCount = session.attendance ? session.attendance.filter(a => a.status !== 'ABSENT').length : 0;
        const totalStudents = this.getStudentCountForCourse(course.id);
        const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

        const modalHTML = `
            <div class="modal" id="session_details_modal">
                <div class="modal_content">
                    <div class="modal_header">
                        <h3 class="modal_title">Session Attendance - ${this.escapeHtml(course.code)}</h3>
                        <button class="close_modal" onclick="instructorDashboard.closeSessionDetailsModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal_body">
                        <div class="session_basic_info">
                            <h4>${this.escapeHtml(course.title)}</h4>
                            <div class="session_meta_clean">
                                <div class="meta_row">
                                    <span class="meta_label">Date:</span>
                                    <span class="meta_value">${sessionDate}</span>
                                </div>
                                <div class="meta_row">
                                    <span class="meta_label">Time:</span>
                                    <span class="meta_value">${sessionTime}</span>
                                </div>
                                <div class="meta_row">
                                    <span class="meta_label">Location:</span>
                                    <span class="meta_value">${course.schedule?.location || 'N/A'}</span>
                                </div>
                                <div class="meta_row">
                                    <span class="meta_label">Attendance:</span>
                                    <span class="meta_value">${presentCount}/${totalStudents} (${attendanceRate}%)</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="attendance_section_clean">
                            <div class="section_header_clean">
                                <h4>Student Attendance</h4>
                                <button class="btn btn_outline btn_small" onclick="instructorDashboard.toggleEditMode()" id="edit_toggle_btn">
                                    <i class="fas fa-edit"></i>
                                    Edit Attendance
                                </button>
                            </div>
                            <div class="table_container_clean">
                                ${this.createAttendanceTableForModal(session, course, false)}
                            </div>
                        </div>
                    </div>
                    <div class="modal_footer">
                        <button class="btn btn_secondary" onclick="instructorDashboard.exportSessionReport('${session.id}', 'csv')">
                            <i class="fas fa-download"></i>
                            Export CSV
                        </button>
                        <button class="btn btn_primary" onclick="instructorDashboard.closeSessionDetailsModal()">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('session_details_modal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        this.editingSession = session;

        const modal = document.getElementById('session_details_modal');
        modal.classList.remove('hidden');

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeSessionDetailsModal();
            }
        });

        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSessionDetailsModal();
            }
        });
    }

    createAttendanceTableForModal(session, course, editMode = false) {
        const courseStudents = this.getStudentsForCourse(course.id);
        const attendanceMap = new Map();
        if (session.attendance) {
            session.attendance.forEach(record => {
                attendanceMap.set(record.studentId, record);
            });
        }

        if (courseStudents.length === 0) {
            return '<div class="no_data_message">No students enrolled in this course</div>';
        }

        const tableRows = courseStudents.map(student => {
            const record = attendanceMap.get(student.id);
            const currentStatus = record ? record.status : 'ABSENT';
            const checkInTime = record && record.checkedInAt ? 
                new Date(record.checkedInAt).toLocaleTimeString() : 'N/A';
            
            const statusClass = currentStatus.toLowerCase();
            
            if (editMode) {
                return `
                    <tr>
                        <td class="student-id" title="${student.universityId}">${student.universityId}</td>
                        <td class="student-name" title="${student.firstName} ${student.lastName}">${student.firstName} ${student.lastName}</td>
                        <td class="student-email" title="${student.email}">${student.email}</td>
                        <td class="student-status">
                            <select class="status_select_clean" data-student-id="${student.id}" onchange="instructorDashboard.updateAttendanceStatus('${student.id}', this.value)">
                                <option value="PRESENT" ${currentStatus === 'PRESENT' ? 'selected' : ''}>Present</option>
                                <option value="ABSENT" ${currentStatus === 'ABSENT' ? 'selected' : ''}>Absent</option>
                                <option value="LATE" ${currentStatus === 'LATE' ? 'selected' : ''}>Late</option>
                            </select>
                        </td>
                        <td class="checkin-time">${checkInTime}</td>
                    </tr>
                `;
            } else {
                const statusIcon = currentStatus === 'PRESENT' ? 'fa-check-circle' : 
                                  currentStatus === 'LATE' ? 'fa-clock' : 'fa-times-circle';

                return `
                    <tr>
                        <td class="student-id" title="${student.universityId}">${student.universityId}</td>
                        <td class="student-name" title="${student.firstName} ${student.lastName}">${student.firstName} ${student.lastName}</td>
                        <td class="student-email" title="${student.email}">${student.email}</td>
                        <td class="student-status">
                            <span class="status_badge ${statusClass}">
                                <i class="fas ${statusIcon}"></i>
                                ${currentStatus.toLowerCase()}
                            </span>
                        </td>
                        <td class="checkin-time">${checkInTime}</td>
                    </tr>
                `;
            }
        }).join('');

        return `
            <table class="clean_table">
                <thead>
                    <tr>
                        <th class="col-id">Student ID</th>
                        <th class="col-name">Name</th>
                        <th class="col-email">Email</th>
                        <th class="col-status">Status</th>
                        <th class="col-time">Check-in Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;
    }

    toggleEditMode() {
        const editBtn = document.getElementById('edit_toggle_btn');
        if (!editBtn) return;
        
        const isEditing = editBtn.classList.contains('editing');
        
        if (isEditing) {
            this.saveAttendanceChanges();
            editBtn.classList.remove('editing');
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Attendance';
            this.refreshAttendanceTable(false);
        } else {
            editBtn.classList.add('editing');
            editBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            this.refreshAttendanceTable(true);
        }
    }

    refreshAttendanceTable(editMode = false) {
        if (!this.editingSession) return;
        
        const course = this.courses.find(c => c.id === this.editingSession.courseId);
        if (!course) return;

        const tableContainer = document.querySelector('.table_container_clean');
        if (tableContainer) {
            tableContainer.innerHTML = this.createAttendanceTableForModal(this.editingSession, course, editMode);
        }
    }

    async updateAttendanceStatus(studentId, newStatus) {
        if (!this.editingSession) return;

        let recordIndex = this.editingSession.attendance.findIndex(a => a.studentId === studentId);
        
        if (newStatus === 'ABSENT') {
            if (recordIndex !== -1) {
                this.editingSession.attendance.splice(recordIndex, 1);
            }
        } else {
            const currentTime = new Date().toISOString();
            
            if (recordIndex !== -1) {
                this.editingSession.attendance[recordIndex].status = newStatus;
                this.editingSession.attendance[recordIndex].checkedInAt = currentTime;
            } else {
                if (!this.editingSession.attendance) {
                    this.editingSession.attendance = [];
                }
                
                const student = this.students.find(s => s.id === studentId);
                this.editingSession.attendance.push({
                    studentId: studentId,
                    studentName: `${student.firstName} ${student.lastName}`,
                    universityId: student.universityId,
                    email: student.email,
                    status: newStatus,
                    checkedInAt: currentTime,
                    sessionId: this.editingSession.id,
                    recordedAt: currentTime
                });
            }
        }
        
        // Update session in database
        await this.updateSessionInDatabase(this.editingSession);
        
        this.updateModalSummaryCards();
    }

    updateModalSummaryCards() {
        if (!this.editingSession) return;
        
        const course = this.courses.find(c => c.id === this.editingSession.courseId);
        if (!course) return;

        const presentCount = this.editingSession.attendance ? this.editingSession.attendance.filter(a => a.status !== 'ABSENT').length : 0;
        const totalStudents = this.getStudentCountForCourse(course.id);
        const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

        const attendanceElement = document.querySelector('.meta_row:nth-child(4) .meta_value');
        if (attendanceElement) {
            attendanceElement.textContent = `${presentCount}/${totalStudents} (${attendanceRate}%)`;
        }
    }

    saveAttendanceChanges() {
        if (!this.editingSession) return;
        
        this.showToast('Attendance changes saved');
        this.saveAppState();
    }

    closeSessionDetailsModal() {
        const modal = document.getElementById('session_details_modal');
        if (modal) {
            modal.remove();
        }
        this.editingSession = null;
    }

    openAddCourseModal() {
        const modalTitle = document.getElementById('course_modal_title');
        const modalSubmit = document.getElementById('course_modal_submit');
        const modal = document.getElementById('course_modal');
        
        if (modalTitle) modalTitle.textContent = 'Add Course';
        if (modalSubmit) modalSubmit.textContent = 'Add Course';
        
        const courseForm = document.getElementById('course_form');
        if (courseForm) courseForm.reset();
        
        if (modal) {
            modal.classList.remove('hidden');
            
            setTimeout(() => {
                modal.style.display = 'flex';
                const modalContent = modal.querySelector('.modal_content');
                if (modalContent) {
                    modalContent.scrollTop = 0;
                }
            }, 10);
        }
    }

    closeCourseModal() {
        const modal = document.getElementById('course_modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        const courseForm = document.getElementById('course_form');
        if (courseForm) {
            courseForm.reset();
        }
    }

    handleCourseSubmit(e) {
        e.preventDefault();
        
        const courseName = document.getElementById('course_name');
        const courseCode = document.getElementById('course_code');
        const courseSemester = document.getElementById('course_semester');
        const sessionDays = document.getElementById('session_days');
        const sessionStartTime = document.getElementById('session_start_time');
        const sessionEndTime = document.getElementById('session_end_time');
        const sessionLocation = document.getElementById('session_location');
        
        if (!courseName || !courseCode || !courseSemester || !sessionDays || !sessionStartTime || !sessionEndTime || !sessionLocation) {
            this.showToast('Please fill in all required fields');
            return;
        }
        
        const courseData = {
            id: 'course_' + Date.now(),
            title: courseName.value,
            code: courseCode.value.toUpperCase(),
            semester: courseSemester.value,
            schedule: {
                days: Array.from(sessionDays.selectedOptions).map(opt => opt.value),
                startTime: sessionStartTime.value,
                endTime: sessionEndTime.value,
                location: sessionLocation.value
            },
            instructorId: this.currentUser.id || 'instructor_1',
            faculty: {
                firstName: this.currentUser.firstName,
                lastName: this.currentUser.lastName
            }
        };

        this.courses.push(courseData);
        
        // Add to global course registry for students to find
        this.addToGlobalCourseRegistry(courseData);
        
        this.closeCourseModal();
        this.renderCourses();
        this.saveAppState();
        this.showToast('Course added successfully');
    }

    addToGlobalCourseRegistry(course) {
        try {
            // Get existing registry from localStorage
            let registry = JSON.parse(localStorage.getItem('globalCourseRegistry') || '[]');
            
            // Check if course code already exists
            const existingIndex = registry.findIndex(c => c.code === course.code);
            if (existingIndex !== -1) {
                // Update existing course
                registry[existingIndex] = course;
            } else {
                // Add new course
                registry.push(course);
            }
            
            // Save back to localStorage
            localStorage.setItem('globalCourseRegistry', JSON.stringify(registry));
            console.log('Course added to global registry:', course.code);
        } catch (error) {
            console.error('Error adding course to registry:', error);
        }
    }

    //Report Export stuff. csv or txt
    exportCourseReport(courseId, format = 'csv') {
        const course = this.courses.find(c => c.id === courseId);
        const courseSessions = this.sessions.filter(s => s.courseId === courseId);
        
        if (!course) {
            this.showToast('Course not found');
            return;
        }

        let content, filename;
        
        if (format === 'csv') {
            content = this.generateCSVContent(course, courseSessions);
            filename = `${course.code}_attendance_report.csv`;
        } else {
            content = this.generateTXTContent(course, courseSessions);
            filename = `${course.code}_attendance_report.txt`;
        }

        this.downloadFile(content, filename, format);
        this.showToast(`Exported ${format.toUpperCase()} report for ${course.code}`);
    }

    generateCSVContent(course, courseSessions) {
        let csvContent = `Course: ${course.title} (${course.code})\n`;
        csvContent += `Semester: ${course.semester}\n`;
        csvContent += `Instructor: ${this.currentUser.firstName} ${this.currentUser.lastName}\n`;
        csvContent += `Report Generated: ${new Date().toLocaleString()}\n\n`;
        
        courseSessions.forEach(session => {
            const sessionDate = new Date(session.startsAt).toLocaleDateString();
            const sessionTime = new Date(session.startsAt).toLocaleTimeString();
            
            csvContent += `SESSION: ${sessionDate} at ${sessionTime}\n`;
            csvContent += 'Student ID,Student Name,Email,Status,Check-in Time\n';
            
            const courseStudents = this.getStudentsForCourse(course.id);
            const attendanceMap = new Map();
            if (session.attendance) {
                session.attendance.forEach(record => {
                    attendanceMap.set(record.studentId, record);
                });
            }
            
            courseStudents.forEach(student => {
                const record = attendanceMap.get(student.id);
                const status = record ? record.status : 'ABSENT';
                const checkInTime = record && record.checkedInAt ? 
                    new Date(record.checkedInAt).toLocaleTimeString() : 'N/A';
                
                csvContent += `"${student.universityId}","${student.firstName} ${student.lastName}","${student.email}","${status}","${checkInTime}"\n`;
            });
            
            csvContent += '\n';
        });

        return csvContent;
    }

    generateTXTContent(course, courseSessions) {
        let txtContent = `ATTENDANCE REPORT\n`;
        txtContent += `================\n\n`;
        txtContent += `Course: ${course.title} (${course.code})\n`;
        txtContent += `Semester: ${course.semester}\n`;
        txtContent += `Instructor: ${this.currentUser.firstName} ${this.currentUser.lastName}\n`;
        txtContent += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        courseSessions.forEach((session, index) => {
            const sessionDate = new Date(session.startsAt).toLocaleDateString();
            const sessionTime = new Date(session.startsAt).toLocaleTimeString();
            const presentCount = session.attendance ? session.attendance.filter(a => a.status !== 'ABSENT').length : 0;
            const totalStudents = this.getStudentCountForCourse(course.id);
            
            txtContent += `SESSION ${index + 1}\n`;
            txtContent += `────────${'─'.repeat((index + 1).toString().length)}\n`;
            txtContent += `Date: ${sessionDate}\n`;
            txtContent += `Time: ${sessionTime}\n`;
            txtContent += `Attendance: ${presentCount}/${totalStudents} (${Math.round((presentCount/totalStudents)*100)}%)\n\n`;
            
            txtContent += `ATTENDANCE LIST:\n`;
            txtContent += `────────────────\n`;
            
            const courseStudents = this.getStudentsForCourse(course.id);
            const attendanceMap = new Map();
            if (session.attendance) {
                session.attendance.forEach(record => {
                    attendanceMap.set(record.studentId, record);
                });
            }
            
            courseStudents.forEach(student => {
                const record = attendanceMap.get(student.id);
                const status = record ? record.status : 'ABSENT';
                const checkInTime = record && record.checkedInAt ? 
                    new Date(record.checkedInAt).toLocaleTimeString() : 'N/A';
                
                txtContent += `• ${student.universityId} - ${student.firstName} ${student.lastName}\n`;
                txtContent += `  Email: ${student.email}\n`;
                txtContent += `  Status: ${status}`;
                if (status !== 'ABSENT') {
                    txtContent += `, Checked in: ${checkInTime}`;
                }
                txtContent += `\n\n`;
            });
            
            txtContent += `${'='.repeat(50)}\n\n`;
        });

        return txtContent;
    }

    exportSessionReport(sessionId, format = 'csv') {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            this.showToast('Session not found');
            return;
        }

        const course = this.courses.find(c => c.id === session.courseId);
        if (!course) {
            this.showToast('Course not found');
            return;
        }

        let content, filename;
        
        if (format === 'csv') {
            content = this.generateSessionCSVContent(session, course);
            filename = `${course.code}_session_${new Date(session.startsAt).toISOString().split('T')[0]}.csv`;
        } else {
            content = this.generateSessionTXTContent(session, course);
            filename = `${course.code}_session_${new Date(session.startsAt).toISOString().split('T')[0]}.txt`;
        }

        this.downloadFile(content, filename, format);
        this.showToast(`Exported session ${format.toUpperCase()} report`);
    }

    generateSessionCSVContent(session, course) {
        const sessionDate = new Date(session.startsAt).toLocaleDateString();
        const sessionTime = new Date(session.startsAt).toLocaleTimeString();
        
        let csvContent = `Session Report: ${course.title} (${course.code})\n`;
        csvContent += `Date: ${sessionDate}\n`;
        csvContent += `Time: ${sessionTime}\n`;
        csvContent += `Location: ${course.schedule?.location || 'N/A'}\n`;
        csvContent += `Instructor: ${this.currentUser.firstName} ${this.currentUser.lastName}\n`;
        csvContent += `Report Generated: ${new Date().toLocaleString()}\n\n`;
        
        csvContent += 'Student ID,Student Name,Email,Status,Check-in Time\n';
        
        const courseStudents = this.getStudentsForCourse(course.id);
        const attendanceMap = new Map();
        if (session.attendance) {
            session.attendance.forEach(record => {
                attendanceMap.set(record.studentId, record);
            });
        }
        
        courseStudents.forEach(student => {
            const record = attendanceMap.get(student.id);
            const status = record ? record.status : 'ABSENT';
            const checkInTime = record && record.checkedInAt ? 
                new Date(record.checkedInAt).toLocaleTimeString() : 'N/A';
            
            csvContent += `"${student.universityId}","${student.firstName} ${student.lastName}","${student.email}","${status}","${checkInTime}"\n`;
        });

        return csvContent;
    }

    generateSessionTXTContent(session, course) {
        const sessionDate = new Date(session.startsAt).toLocaleDateString();
        const sessionTime = new Date(session.startsAt).toLocaleTimeString();
        const presentCount = session.attendance ? session.attendance.filter(a => a.status !== 'ABSENT').length : 0;
        const totalStudents = this.getStudentCountForCourse(course.id);
        
        let txtContent = `SESSION ATTENDANCE REPORT\n`;
        txtContent += `========================\n\n`;
        txtContent += `Course: ${course.title} (${course.code})\n`;
        txtContent += `Date: ${sessionDate}\n`;
        txtContent += `Time: ${sessionTime}\n`;
        txtContent += `Location: ${course.schedule?.location || 'N/A'}\n`;
        txtContent += `Instructor: ${this.currentUser.firstName} ${this.currentUser.lastName}\n`;
        txtContent += `Generated: ${new Date().toLocaleString()}\n\n`;
        txtContent += `Attendance Summary: ${presentCount}/${totalStudents} students present\n\n`;
        
        txtContent += `ATTENDANCE DETAILS:\n`;
        txtContent += `──────────────────\n\n`;
        
        const courseStudents = this.getStudentsForCourse(course.id);
        const attendanceMap = new Map();
        if (session.attendance) {
            session.attendance.forEach(record => {
                attendanceMap.set(record.studentId, record);
            });
        }
        
        courseStudents.forEach(student => {
            const record = attendanceMap.get(student.id);
            const status = record ? record.status : 'ABSENT';
            const checkInTime = record && record.checkedInAt ? 
                new Date(record.checkedInAt).toLocaleTimeString() : 'N/A';
            
            txtContent += `• ${student.universityId} - ${student.firstName} ${student.lastName}\n`;
            txtContent += `  Email: ${student.email}\n`;
            txtContent += `  Status: ${status}`;
            if (status !== 'ABSENT') {
                txtContent += `, Checked in: ${checkInTime}`;
            }
            txtContent += `\n\n`;
        });

        return txtContent;
    }

    exportAllReports(format = 'csv') {
        let content, filename;
        
        if (format === 'csv') {
            content = this.generateAllCSVContent();
            filename = 'all_courses_attendance_reports.csv';
        } else {
            content = this.generateAllTXTContent();
            filename = 'all_courses_attendance_reports.txt';
        }

        this.downloadFile(content, filename, format);
        this.showToast(`Exported all ${format.toUpperCase()} reports`);
    }

    generateAllCSVContent() {
        let csvContent = 'Attendance Reports - All Courses\n';
        csvContent += `Generated: ${new Date().toLocaleString()}\n`;
        csvContent += `Instructor: ${this.currentUser.firstName} ${this.currentUser.lastName}\n\n`;
        
        this.courses.forEach(course => {
            csvContent += `Course: ${course.title} (${course.code})\n`;
            csvContent += `Semester: ${course.semester}\n`;
            
            const courseSessions = this.sessions.filter(s => s.courseId === course.id);
            if (courseSessions.length === 0) {
                csvContent += 'No sessions recorded\n\n';
                return;
            }
            
            courseSessions.forEach(session => {
                const sessionDate = new Date(session.startsAt).toLocaleDateString();
                const sessionTime = new Date(session.startsAt).toLocaleTimeString();
                
                csvContent += `Session: ${sessionDate} at ${sessionTime}\n`;
                csvContent += 'Student ID,Student Name,Email,Status,Check-in Time\n';
                
                const courseStudents = this.getStudentsForCourse(course.id);
                const attendanceMap = new Map();
                if (session.attendance) {
                    session.attendance.forEach(record => {
                        attendanceMap.set(record.studentId, record);
                    });
                }
                
                courseStudents.forEach(student => {
                    const record = attendanceMap.get(student.id);
                    const status = record ? record.status : 'ABSENT';
                    const checkInTime = record && record.checkedInAt ? 
                        new Date(record.checkedInAt).toLocaleTimeString() : 'N/A';
                    
                    csvContent += `"${student.universityId}","${student.firstName} ${student.lastName}","${student.email}","${status}","${checkInTime}"\n`;
                });
                
                csvContent += '\n';
            });
            
            csvContent += '\n';
        });

        return csvContent;
    }

    generateAllTXTContent() {
        let txtContent = `COMPREHENSIVE ATTENDANCE REPORTS\n`;
        txtContent += `=================================\n\n`;
        txtContent += `Generated: ${new Date().toLocaleString()}\n`;
        txtContent += `Instructor: ${this.currentUser.firstName} ${this.currentUser.lastName}\n\n`;
        
        this.courses.forEach((course, courseIndex) => {
            txtContent += `COURSE ${courseIndex + 1}: ${course.title} (${course.code})\n`;
            txtContent += `${'═'.repeat(60)}\n`;
            txtContent += `Semester: ${course.semester}\n\n`;
            
            const courseSessions = this.sessions.filter(s => s.courseId === course.id);
            if (courseSessions.length === 0) {
                txtContent += `No sessions recorded for this course.\n\n`;
                txtContent += `${'─'.repeat(60)}\n\n`;
                return;
            }
            
            txtContent += `Summary: ${courseSessions.length} sessions, ${this.getStudentCountForCourse(course.id)} students\n\n`;
            
            courseSessions.forEach((session, sessionIndex) => {
                const sessionDate = new Date(session.startsAt).toLocaleDateString();
                const sessionTime = new Date(session.startsAt).toLocaleTimeString();
                const presentCount = session.attendance ? session.attendance.filter(a => a.status !== 'ABSENT').length : 0;
                const totalStudents = this.getStudentCountForCourse(course.id);
                
                txtContent += `Session ${sessionIndex + 1}: ${sessionDate} at ${sessionTime}\n`;
                txtContent += `Attendance: ${presentCount}/${totalStudents} students\n\n`;
            });
            
            txtContent += `${'─'.repeat(60)}\n\n`;
        });

        return txtContent;
    }

    downloadFile(content, filename, format) {
        try {
            const mimeType = format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;';
            const blob = new Blob([content], { type: mimeType });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } catch (error) {
            console.error('Error downloading file:', error);
            this.showToast('Error downloading file');
        }
    }

    getStudentsForCourse(courseId) {
        return this.students.filter(student => 
            student.courses && student.courses.includes(courseId)
        );
    }

    getStudentCountForCourse(courseId) {
        return this.getStudentsForCourse(courseId).length;
    }

    getCourseStats(courseId) {
        const courseSessions = this.sessions.filter(s => s.courseId === courseId);
        const totalStudents = this.getStudentCountForCourse(courseId);
        
        if (courseSessions.length === 0 || totalStudents === 0) {
            return { attendanceRate: 0, totalSessions: 0 };
        }

        let totalPossibleAttendances = courseSessions.length * totalStudents;
        let totalActualAttendances = 0;

        courseSessions.forEach(session => {
            if (session.attendance) {
                totalActualAttendances += session.attendance.filter(a => 
                    a.status === 'PRESENT' || a.status === 'LATE'
                ).length;
            }
        });

        const attendanceRate = totalPossibleAttendances > 0 ? 
            Math.round((totalActualAttendances / totalPossibleAttendances) * 100) : 0;

        return {
            attendanceRate: attendanceRate,
            totalSessions: courseSessions.length
        };
    }

    getCurrentAttendanceStatus(studentId, courseId) {
        if (this.activeSession && this.activeSession.courseId === courseId) {
            return this.studentAttendance.get(studentId) || 'ABSENT';
        }
        return 'ABSENT';
    }

    getCourseName(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        return course ? `${course.code} - ${course.title}` : 'Unknown Course';
    }

    updateUIElement(elementId, content) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = content;
        }
    }

    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, duration);
        }
    }

    debugSessionState() {
        console.log('Current Session State:', {
            activeSession: this.activeSession,
            currentCourse: this.currentCourse,
            studentAttendanceSize: this.studentAttendance.size,
            currentSection: this.currentSection
        });
    }

    // Navigation History Management
    pushNavigationState(section, data = {}) {
        this.navigationHistory.push({
            section: section,
            data: data,
            timestamp: Date.now()
        });
        this.updateBackButton();
    }

    popNavigationState() {
        if (this.navigationHistory.length > 1) {
            this.navigationHistory.pop(); // Remove current
            const previous = this.navigationHistory[this.navigationHistory.length - 1];
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
            this.switchSection(previous.section, false);
            if (previous.data.courseId) {
                this.currentCourse = this.courses.find(c => c.id === previous.data.courseId);
            }
        }
    }

    // Student Management Functions
    openManageStudentsModal() {
        if (!this.currentCourse) {
            this.showToast('Please select a course first');
            return;
        }

        const modal = document.getElementById('manage_students_modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.loadPendingStudents();
            this.loadEnrolledStudents();
            this.setupManageStudentsTabs();
        }
    }

    closeManageStudentsModal() {
        const modal = document.getElementById('manage_students_modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.renderStudentsTable(this.currentCourse.id);
    }

    setupManageStudentsTabs() {
        const tabBtns = document.querySelectorAll('.manage_students_tabs .tab_btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const tab = btn.dataset.tab;
                document.querySelectorAll('.tab_content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`${tab}_students_tab`).classList.add('active');
            });
        });

        // Setup manual add form
        const manualForm = document.getElementById('manual_student_form');
        if (manualForm) {
            manualForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addStudentManually();
            });
        }
    }

    showAddMethod(method) {
        document.querySelectorAll('.add_method_content').forEach(el => el.classList.add('hidden'));
        document.getElementById(`${method}_add`).classList.remove('hidden');
    }

    addStudentManually() {
        const studentId = document.getElementById('manual_student_id').value.trim();
        const firstName = document.getElementById('manual_first_name').value.trim();
        const lastName = document.getElementById('manual_last_name').value.trim();
        const email = document.getElementById('manual_email').value.trim();

        if (!studentId || !firstName || !lastName || !email) {
            this.showToast('Please fill in all fields');
            return;
        }

        // Check if student already exists
        let student = this.students.find(s => s.universityId === studentId);
        
        if (!student) {
            // Create new student
            student = {
                id: 'student_' + Date.now(),
                universityId: studentId,
                firstName: firstName,
                lastName: lastName,
                email: email,
                courses: [this.currentCourse.id]
            };
            this.students.push(student);
        } else {
            // Add course to existing student
            if (!student.courses) student.courses = [];
            if (!student.courses.includes(this.currentCourse.id)) {
                student.courses.push(this.currentCourse.id);
            } else {
                this.showToast('Student already enrolled in this course');
                return;
            }
        }

        this.showToast(`Added ${firstName} ${lastName} to ${this.currentCourse.code}`);
        document.getElementById('manual_student_form').reset();
        this.loadEnrolledStudents();
        this.renderStudentsTable(this.currentCourse.id);
        this.saveAppState();
    }

    importStudentList() {
        const textarea = document.getElementById('import_textarea');
        const lines = textarea.value.split('\n').filter(line => line.trim());

        let added = 0;
        let skipped = 0;

        lines.forEach(line => {
            const parts = line.split(',').map(p => p.trim());
            if (parts.length >= 4) {
                const [studentId, firstName, lastName, email] = parts;
                
                let student = this.students.find(s => s.universityId === studentId);
                
                if (!student) {
                    student = {
                        id: 'student_' + Date.now() + '_' + Math.random(),
                        universityId: studentId,
                        firstName: firstName,
                        lastName: lastName,
                        email: email,
                        courses: [this.currentCourse.id]
                    };
                    this.students.push(student);
                    added++;
                } else {
                    if (!student.courses) student.courses = [];
                    if (!student.courses.includes(this.currentCourse.id)) {
                        student.courses.push(this.currentCourse.id);
                        added++;
                    } else {
                        skipped++;
                    }
                }
            }
        });

        this.showToast(`Imported ${added} students${skipped > 0 ? `, skipped ${skipped} duplicates` : ''}`);
        textarea.value = '';
        this.loadEnrolledStudents();
        this.renderStudentsTable(this.currentCourse.id);
        this.saveAppState();
    }

    loadPendingStudents() {
        const courseId = this.currentCourse.id;
        
        // Load from localStorage
        let pending = [];
        try {
            const allPending = JSON.parse(localStorage.getItem('pendingStudents') || '{}');
            pending = allPending[courseId] || [];
        } catch (error) {
            console.error('Error loading pending students:', error);
        }
        
        // Also check the in-memory map (for backwards compatibility)
        const memoryPending = this.pendingStudents.get(courseId) || [];
        
        // Merge both sources (remove duplicates by student id)
        const mergedMap = new Map();
        [...pending, ...memoryPending].forEach(student => {
            mergedMap.set(student.id, student);
        });
        pending = Array.from(mergedMap.values());
        
        document.getElementById('pending_count').textContent = pending.length;
        
        const container = document.getElementById('pending_students_list');
        if (pending.length === 0) {
            container.innerHTML = '<div class="empty_message">No pending students</div>';
        } else {
            container.innerHTML = pending.map(student => `
                <div class="pending_student_item">
                    <div class="student_info">
                        <div class="student_name">${this.escapeHtml(student.firstName)} ${this.escapeHtml(student.lastName)}</div>
                        <div class="student_details">${this.escapeHtml(student.universityId)} • ${this.escapeHtml(student.email)}</div>
                    </div>
                    <button class="btn btn_primary btn_small" onclick="instructorDashboard.approvePendingStudent('${student.id}')">
                        <i class="fas fa-check"></i>
                        Approve
                    </button>
                </div>
            `).join('');
        }
    }

    approvePendingStudent(studentId) {
        const courseId = this.currentCourse.id;
        
        // Load pending students from localStorage
        let allPending = {};
        try {
            allPending = JSON.parse(localStorage.getItem('pendingStudents') || '{}');
        } catch (error) {
            console.error('Error loading pending students:', error);
        }
        
        const pending = allPending[courseId] || [];
        const studentIndex = pending.findIndex(s => s.id === studentId);
        
        if (studentIndex !== -1) {
            const pendingStudent = pending[studentIndex];
            
            console.log('Approving pending student:', pendingStudent);
            
            // IMPORTANT: Match by email or universityId, NOT by ID
            // This prevents conflicts between test data and real students
            let existingStudent = this.students.find(s => 
                s.email === pendingStudent.email || 
                s.universityId === pendingStudent.universityId
            );
            
            if (existingStudent) {
                console.log('Found existing student by email/universityId:', existingStudent);
                
                // Update the existing student's info with pending student's info
                // This ensures the correct name is used
                existingStudent.firstName = pendingStudent.firstName;
                existingStudent.lastName = pendingStudent.lastName;
                existingStudent.email = pendingStudent.email;
                existingStudent.universityId = pendingStudent.universityId;
                
                // Add the course if not already enrolled
                if (!existingStudent.courses) existingStudent.courses = [];
                if (!existingStudent.courses.includes(courseId)) {
                    existingStudent.courses.push(courseId);
                }
                
                console.log('Updated existing student:', existingStudent);
            } else {
                console.log('Creating new student record');
                // Create new student record with the EXACT info from pending
                existingStudent = {
                    id: pendingStudent.id,
                    universityId: pendingStudent.universityId,
                    firstName: pendingStudent.firstName,
                    lastName: pendingStudent.lastName,
                    email: pendingStudent.email,
                    courses: [courseId]
                };
                this.students.push(existingStudent);
                console.log('Created new student:', existingStudent);
            }
            
            // Remove from pending list
            pending.splice(studentIndex, 1);
            allPending[courseId] = pending;
            
            // Save back to localStorage
            try {
                localStorage.setItem('pendingStudents', JSON.stringify(allPending));
            } catch (error) {
                console.error('Error saving pending students:', error);
            }
            
            // Also update in-memory map
            this.pendingStudents.set(courseId, pending);
            
            this.showToast(`Approved ${pendingStudent.firstName} ${pendingStudent.lastName}`);
            this.loadPendingStudents();
            this.loadEnrolledStudents();
            this.renderStudentsTable(courseId);
            this.saveAppState();
        }
    }

    loadEnrolledStudents() {
        const courseStudents = this.getStudentsForCourse(this.currentCourse.id);
        const container = document.getElementById('enrolled_students_list');
        
        if (courseStudents.length === 0) {
            container.innerHTML = '<div class="empty_message">No students enrolled</div>';
        } else {
            container.innerHTML = courseStudents.map(student => {
                const attendanceRate = this.calculateStudentAttendanceRate(student.id, this.currentCourse.id);
                return `
                    <div class="enrolled_student_item">
                        <div class="student_info">
                            <div class="student_name">${this.escapeHtml(student.firstName)} ${this.escapeHtml(student.lastName)}</div>
                            <div class="student_details">${this.escapeHtml(student.universityId)} • ${this.escapeHtml(student.email)}</div>
                            <div class="student_stats">Attendance: ${attendanceRate}%</div>
                        </div>
                        <button class="btn btn_danger btn_small" onclick="instructorDashboard.removeStudentFromCourse('${student.id}')">
                            <i class="fas fa-times"></i>
                            Remove
                        </button>
                    </div>
                `;
            }).join('');
        }
    }

    removeStudentFromCourse(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return;

        if (confirm(`Remove ${student.firstName} ${student.lastName} from ${this.currentCourse.code}?`)) {
            if (student.courses) {
                student.courses = student.courses.filter(cid => cid !== this.currentCourse.id);
            }
            
            this.showToast(`Removed ${student.firstName} ${student.lastName}`);
            this.loadEnrolledStudents();
            this.renderStudentsTable(this.currentCourse.id);
            this.saveAppState();
        }
    }

    calculateStudentAttendanceRate(studentId, courseId) {
        const courseSessions = this.sessions.filter(s => s.courseId === courseId && s.status === 'completed');
        if (courseSessions.length === 0) return 0;

        let presentCount = 0;
        courseSessions.forEach(session => {
            if (session.attendance) {
                const record = session.attendance.find(a => a.studentId === studentId);
                if (record && record.status !== 'ABSENT') {
                    presentCount++;
                }
            }
        });

        return Math.round((presentCount / courseSessions.length) * 100);
    }

    initializeEnhancedStyles() {
        this.enhanceSessionStyles();
    }

    enhanceSessionStyles() {
        const sessionStyles = `
            <style>
                .session_status {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                
                .session_status.active {
                    background: #e8f5e8;
                    color: #2e7d32;
                    border: 1px solid #2e7d32;
                }
                
                .show_more_sessions {
                    text-align: center;
                    margin: 20px 0;
                    padding: 10px;
                }
                
                .all_sessions {
                    margin-top: 10px;
                }
                
                .no_sessions_hint {
                    font-size: 0.9rem;
                    color: #666;
                    margin-top: 8px;
                }
                
                .session_report {
                    margin-bottom: 15px;
                    padding: 15px;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    background: white;
                }
                
                .session_report:last-child {
                    margin-bottom: 0;
                }
                
                .session_info {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 15px;
                }
                
                .session_details h4 {
                    margin: 0 0 8px 0;
                    color: #333;
                    font-size: 1.1rem;
                }
                
                .session_meta {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    flex-wrap: wrap;
                }
                
                .session_location {
                    color: #666;
                    font-size: 0.9rem;
                }
                
                .session_actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0;
                }
                
                .session_stats_badge {
                    background: #f8f9fa;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #333;
                    border: 1px solid #e0e0e0;
                }
                
                @media (max-width: 768px) {
                    .session_info {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 10px;
                    }
                    
                    .session_actions {
                        justify-content: flex-start;
                        flex-wrap: wrap;
                    }
                    
                    .session_meta {
                        gap: 10px;
                    }
                }
            </style>
        `;
        
        if (!document.querySelector('#session_styles')) {
            document.head.insertAdjacentHTML('beforeend', sessionStyles);
        }
    }
}

// Global functions with error handling
function openAddCourseModal() { 
    try { 
        if (window.instructorDashboard) {
            window.instructorDashboard.openAddCourseModal(); 
        } else {
            console.error('Instructor dashboard not initialized');
            alert('Not ready. Please refresh the page.');
        }
    } catch(e) { 
        console.error('Error opening modal:', e); 
        alert('Error opening course modal. Please check console.');
    }
}

function closeCourseModal() { 
    try { 
        if (window.instructorDashboard) {
            window.instructorDashboard.closeCourseModal(); 
        }
    } catch(e) { 
        console.error('Error closing modal:', e); 
    }
}

async function startSession() { 
    try { 
        if (window.instructorDashboard) {
            await window.instructorDashboard.startSession(); 
            setTimeout(() => {
                window.instructorDashboard.debugSessionState();
            }, 1000);
        }
    } catch(e) { 
        console.error('Error starting session:', e); 
        alert('Error starting session. Please check console.');
    }
}

async function endSession() { 
    try { 
        if (window.instructorDashboard) {
            await window.instructorDashboard.endSession(); 
        }
    } catch(e) { 
        console.error('Error ending session:', e); 
    }
}

function openSessionDisplay() { 
    try { 
        if (window.instructorDashboard) {
            window.instructorDashboard.openSessionDisplay(); 
        }
    } catch(e) { 
        console.error('Error opening session display:', e); 
        alert('Error opening session display. Please check console.');
    }
}

function exportAllReports(format) { 
    try { 
        if (window.instructorDashboard) {
            window.instructorDashboard.exportAllReports(format); 
        }
    } catch(e) { 
        console.error('Error exporting reports:', e); 
        alert('Error exporting reports. Please check console.');
    }
}

function exportSessionReport(sessionId, format) { 
    try { 
        if (window.instructorDashboard) {
            window.instructorDashboard.exportSessionReport(sessionId, format); 
        }
    } catch(e) { 
        console.error('Error exporting session:', e); 
    }
}

function viewSessionDetails(sessionId) { 
    try { 
        if (window.instructorDashboard) {
            window.instructorDashboard.viewSessionDetailsModal(sessionId); 
        }
    } catch(e) { 
        console.error('Error viewing session details:', e); 
    }
}

function deleteCourse(courseId) {
    try { 
        if (window.instructorDashboard) {
            window.instructorDashboard.deleteCourse(courseId); 
        }
    } catch(e) { 
        console.error('Error deleting course:', e); 
        alert('Error deleting course. Please check console.');
    }
}

function openManageStudentsModal() {
    try {
        if (window.instructorDashboard) {
            window.instructorDashboard.openManageStudentsModal();
        }
    } catch(e) {
        console.error('Error opening manage students modal:', e);
    }
}

function closeManageStudentsModal() {
    try {
        if (window.instructorDashboard) {
            window.instructorDashboard.closeManageStudentsModal();
        }
    } catch(e) {
        console.error('Error closing manage students modal:', e);
    }
}

function showAddMethod(method) {
    try {
        if (window.instructorDashboard) {
            window.instructorDashboard.showAddMethod(method);
        }
    } catch(e) {
        console.error('Error showing add method:', e);
    }
}

function importStudentList() {
    try {
        if (window.instructorDashboard) {
            window.instructorDashboard.importStudentList();
        }
    } catch(e) {
        console.error('Error importing student list:', e);
    }
}

function filterStudents() {
    const searchInput = document.getElementById('student_search');
    const filter = searchInput.value.toLowerCase();
    const items = document.querySelectorAll('.enrolled_student_item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(filter) ? '' : 'none';
    });
}

// Enhanced initialization with comprehensive error handling
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing instructor dashboard...');
    
    // Check if test data is available. We can remove this
    if (typeof INSTRUCTOR_TEST_DATA === 'undefined') {
        console.error('INSTRUCTOR_TEST_DATA is not defined. Please check instructor_test_data.js');
        const errorMsg = 'Error: Test data not loaded.';
        
        // Error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'padding: 20px; color: red; text-align: center; background: #ffeeee; border: 1px solid red; margin: 20px;';
        errorDiv.innerHTML = `
            <h3>Application Error</h3>
            <p>${errorMsg}</p>
            <p><small>Check the browser console for more details.</small></p>
        `;
        
        // Insert at the beginning of body
        document.body.insertBefore(errorDiv, document.body.firstChild);
        
        // Warning msg
        console.warn('Attempting to initialize with minimal data...');
    }
    
    try {
        window.instructorDashboard = new InstructorDashboard();
        console.log('Instructor dashboard initialized successfully');
    } catch (error) {
        console.error('Failed to initialize instructor dashboard:', error);
        const errorMsg = 'Error initializing application. Please check the console and refresh the page.';
        
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'padding: 20px; color: red; text-align: center; background: #ffeeee; border: 1px solid red; margin: 20px;';
        errorDiv.innerHTML = `
            <h3>Initialization Error</h3>
            <p>${errorMsg}</p>
            <p><small>${error.message}</small></p>
        `;
        
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
});

// Make the class available globally
window.InstructorDashboard = InstructorDashboard;

// Modal CSS with for multiple browsers
const cleanModalCSS = `
/* Clean modal styles with cross-browser compatibility */
.session_basic_info {
    background: white;
    padding: 0;
    margin-bottom: 25px;
}

.session_basic_info h4 {
    margin: 0 0 15px 0;
    color: #333;
    font-size: 1.3rem;
    font-weight: 600;
}

.session_meta_clean {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.meta_row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.meta_label {
    font-weight: 600;
    color: #333;
    min-width: 80px;
}

.meta_value {
    color: #666;
}

.attendance_section_clean {
    background: white;
    border-radius: 6px;
}

.section_header_clean {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    flex-wrap: wrap;
    gap: 15px;
}

.section_header_clean h4 {
    margin: 0;
    color: #333;
    font-size: 1.2rem;
    font-weight: 600;
}

.table_container_clean {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
    max-height: 400px;
    overflow-y: auto;
    /* Cross-browser scrollbar hiding */
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
}

.table_container_clean::-webkit-scrollbar {
    display: none; /* Chrome, Safari and Opera */
}

.clean_table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    table-layout: fixed; /* Consistent column sizing */
}

.clean_table th {
    background: #f8f9fa;
    padding: 15px 12px;
    text-align: left;
    font-weight: 600;
    color: #333;
    border-bottom: 1px solid #e0e0e0;
    position: sticky;
    top: 0;
}

.clean_table td {
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: top;
}

.clean_table tr:hover {
    background: #f8f9fa;
}

/* Column sizing for long content */
.clean_table .col-id {
    width: 120px;
    min-width: 120px;
}

.clean_table .col-name {
    width: 180px;
    min-width: 180px;
}

.clean_table .col-email {
    width: 220px;
    min-width: 220px;
}

.clean_table .col-status {
    width: 120px;
    min-width: 120px;
}

.clean_table .col-time {
    width: 100px;
    min-width: 100px;
}

/* Handle long text */
.student-id, .student-name, .student-email, .checkin-time {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.student-email {
    white-space: normal;
    word-break: break-word;
    max-width: 220px;
}

.status_badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
}

.status_badge.present {
    background: #e8f5e8;
    color: #2e7d32;
}

.status_badge.absent {
    background: #ffebee;
    color: #c62828;
}

.status_badge.late {
    background: #fff3e0;
    color: #ef6c00;
}

.status_select_clean {
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    font-size: 0.8rem;
    min-width: 90px;
    width: 100%;
    max-width: 100px;
}

.no_data_message {
    text-align: center;
    padding: 40px 20px;
    color: #666;
    font-style: italic;
}

/* Edit button states */
#edit_toggle_btn.editing {
    background: #2e7d32;
    color: white;
    border-color: #2e7d32;
}

#edit_toggle_btn.editing:hover {
    background: #1b5e20;
    border-color: #1b5e20;
}

/* Modal styles */
.modal_content {
    padding: 0;
    max-width: 95vw;
    width: 900px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal_body {
    padding: 25px;
}

.modal_header {
    padding: 20px 25px;
    border-bottom: 1px solid #e0e0e0;
}

.modal_footer {
    padding: 20px 25px;
    border-top: 1px solid #e0e0e0;
    background: #f8f9fa;
}

/* Expandable sessions */
.show_more_sessions {
    text-align: center;
    margin: 20px 0;
    padding: 10px;
}

.all_sessions {
    margin-top: 10px;
}

.hidden {
    display: none !important;
}

/* Session report styles */
.session_report {
    margin-bottom: 15px;
    padding: 15px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: white;
}

.session_report:last-child {
    margin-bottom: 0;
}

.session_info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 15px;
}

.session_details h4 {
    margin: 0 0 8px 0;
    color: #333;
    font-size: 1.1rem;
}

.session_meta {
    display: flex;
    align-items: center;
    gap: 15px;
    flex-wrap: wrap;
}

.session_location {
    color: #666;
    font-size: 0.9rem;
}

.session_actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
}

.session_stats_badge {
    background: #f8f9fa;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
    color: #333;
    border: 1px solid #e0e0e0;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
    .section_header_clean {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .section_header_clean .btn {
        width: 100%;
        justify-content: center;
    }
    
    .meta_row {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
    }
    
    .meta_label {
        min-width: auto;
    }
    
    .table_container_clean {
        overflow-x: auto;
    }
    
    .clean_table {
        min-width: 700px;
        table-layout: auto;
    }
    
    .clean_table th,
    .clean_table td {
        width: auto;
        min-width: auto;
    }
    
    .modal_content {
        margin: 10px;
        width: calc(100% - 20px);
        max-width: none;
    }
    
    .modal_body {
        padding: 15px;
    }
    
    .modal_header {
        padding: 15px;
    }
    
    .modal_footer {
        padding: 15px;
    }
    
    .clean_table th,
    .clean_table td {
        padding: 10px 8px;
        font-size: 0.9rem;
    }
    
    .session_info {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
    }
    
    .session_actions {
        justify-content: flex-start;
        flex-wrap: wrap;
    }
    
    .session_meta {
        gap: 10px;
    }
}

@media (max-width: 480px) {
    .modal_content {
        margin: 5px;
        width: calc(100% - 10px);
    }
    
    .modal_body {
        padding: 10px;
    }
    
    .modal_header {
        padding: 12px 15px;
    }
    
    .modal_footer {
        padding: 12px 15px;
    }
    
    .clean_table th,
    .clean_table td {
        padding: 8px 6px;
        font-size: 0.85rem;
    }
    
    .status_select_clean {
        min-width: 80px;
        font-size: 0.75rem;
        padding: 4px 6px;
    }
}

/* Tooltip for truncated content */
.student-id, .student-name, .student-email {
    position: relative;
}

.student-id:hover::after,
.student-name:hover::after,
.student-email:hover::after {
    content: attr(title);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 0.8rem;
    white-space: nowrap;
    z-index: 1000;
    pointer-events: none;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Fix for older browsers */
.modal {
    background: rgba(0, 0, 0, 0.5);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

/* Basic flexbox fallback */
.modal_content {
    display: block;
}

@supports (display: flex) {
    .modal_content {
        display: flex;
        flex-direction: column;
    }
}
`;

// Inject the clean modal CSS with error handling
try {
    const cleanStyle = document.createElement('style');
    cleanStyle.textContent = cleanModalCSS;
    document.head.appendChild(cleanStyle);
} catch (error) {
    console.warn('Could not inject modal CSS:', error);
}