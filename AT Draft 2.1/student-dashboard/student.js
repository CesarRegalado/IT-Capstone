import {User, Student, Instructor, Course, Session, Attendance, qrcode} from "../classes/index.js";
import { testDB } from '../classes/testDB.js';

// Student Dashboard Functionality
class StudentDashboard {
    constructor() {
        this.currentUser = new Student();
        this.instructors = [];
        this.courses = [];
        this.sessions = [];
        this.qrCodes = [];
        this.attendance = [];
        
        console.log('StudentDashboard: Initializing...');
        this.initializeApp();
    }

    async initializeApp() {
        // Load user from session storage (set during login)
        const userData = sessionStorage.getItem('currentStudent');
        //FIXME: We should ideally fetch this data from an API or database, 
        //       but for demo purposes we'll use testDB
        if (!userData) {
            console.log('No user session found, loading demo data...');
            this.loadTestData();
        } else {
            const currentUser = JSON.parse(userData);
            const student = testDB.usersArr.find(u => u.UNTemail === currentUser.UNTemail);
            if (student) {
                this.currentUser = student;
                console.log('Loaded user from session:', this.currentUser);
                // FIXME: this loads test data based on the current user, 
                //        in a real app this would be fetched from an API
                this.loadTestData();
            } else {
                console.warn('User from session not found in database, loading demo data...');
            }
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
    // For demo purposes, this function loads test data from the testDB based on the current user.
    // FIXME: this should be replaced with loadDataFromAPI() that fetches real data from a backend service.
    loadTestData() {
        console.log('Loading test data for student dashboard...');
        for (const course of this.currentUser.coursesEnrolled) {
            const courseObj = testDB.coursesArr.filter(c => c.courseId === course);
            if (courseObj && courseObj.length > 0) {
                this.courses.push(courseObj[0]);
            }
        }

        for (const course of this.courses) {
            const instrusctorObj = testDB.usersArr.filter(i => i.instructorId === course.instructorID);
            if (instrusctorObj && instrusctorObj.length > 0) {
                this.instructors.push(...instrusctorObj);
            }
        }

        for (const course of this.courses) {
            const sessionObj = testDB.sessionsArr.filter(c => c.courseId === course.courseId);
            if (sessionObj && sessionObj.length > 0) {
                this.sessions.push(...sessionObj);
            }
        }

        for (const session of this.sessions) {
            const qrObj = testDB.qrcodesArr.filter(q => q.sessionId === session.sessionId);
            if (qrObj && qrObj.length > 0) {
                this.qrCodes.push(...qrObj);
            }
        }

        for (const code of this.qrCodes) {
            const attendanceObj = testDB.attendanceArr.filter(a => a.code === code.code);
            if (attendanceObj && attendanceObj.length > 0) {
                this.attendance.push(...attendanceObj);
            }
        }

        console.log('Test data loaded:', {
            courses: this.courses,
            instructors: this.instructors,
            sessions: this.sessions,
            qrCodes: this.qrCodes,
            attendance: this.attendance
        });        
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
    
    // Render the courses the student is enrolled in, along with attendance percentage and check-in options
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
        //FIXME: This might change depending on what we want the Card to look like.
        const sessionObj = this.sessions.filter(s => s.courseId === course.courseId);
        const totalSessions = sessionObj.length; 
        const qrObj = this.qrCodes.filter(q => sessionObj.some(s => s.sessionId === q.sessionId));
        const attendanceObj = this.attendance.filter(a => qrObj.some(q => q.code === a.code));
        const courseAttendance = attendanceObj.filter(a => a.sessionAttendance === 'PRESENT').length;
        const attendancePercentage = totalSessions > 0 ? Math.round((courseAttendance / totalSessions) * 100) : 0;
        
        const attendanceStatus = attendancePercentage >= 90 ? 'excellent' : 
                              attendancePercentage >= 80 ? 'good' : 
                              attendancePercentage >= 70 ? 'warning' : 'poor';
        const instructor = this.instructors.find(i => i.instructorId === course.instructorID);
        
        // FIXME: Need to implement logic to determine if there's a session today for this course 
        //        and if the student has already checked in, to show appropriate check-in options and status on the card.
        const todaySession = this.sessions.find(s => s.courseId === course.courseId);
        
        return `
            <div class="class_card" data-course-id="${course.courseId}">
                <div class="class_header">
                    <h3>${this.escapeHtml(course.courseName)}</h3>
                    <span class="class_code">${this.escapeHtml(course.courseId)}</span>
                </div>
                <div class="class_info">
                    <p><i class="fas fa-user"></i> Prof. ${this.escapeHtml(instructor.lastName)}</p>
                    <p><i class="fas fa-calendar"></i> ${this.escapeHtml(course.weekDays)}</p>
                    ${todaySession ? `
                        <p><i class="fas fa-clock"></i>${course.startTime}</p>
                    ` : ''}
                </div>
                <div class="attendance_badge attendance_${attendanceStatus}">
                    ${attendancePercentage}% Attendance (${courseAttendance}/${totalSessions})
                </div>
                <div class="class_actions">
                    <button class="btn btn_primary btn_small" onclick="studentDashboard.checkInToCourse('${course.courseId}')">
                        <i class="fas fa-qrcode"></i>
                        Check In
                    </button>
                    <button class="btn btn_secondary btn_small" onclick="studentDashboard.viewCourseDetails('${course.courseId}')">
                        <i class="fas fa-chart-bar"></i>
                        Details
                    </button>
                </div>
            </div>
        `;
    }

    renderAttendanceOverview() {
        const present = this.attendance.filter(record => record.sessionAttendance === 'PRESENT').length;
        const absent = this.attendance.filter(record => record.sessionAttendance === 'ABSENT').length;
        const late = this.attendance.filter(record => record.sessionAttendance === 'LATE').length;

        this.updateUIElement('present_count', present.toString());
        this.updateUIElement('absent_count', absent.toString());
        this.updateUIElement('late_count', late.toString());
    }
    // Render detailed attendance records for each course, 
    // showing dates and status for each session attended.
    renderAttendanceDetails() {
        const container = document.getElementById('attendance_list');
        
        if (this.attendance.length === 0) {
            container.innerHTML = this.createEmptyAttendance();
            return;
        }

        container.innerHTML = this.courses.map(course => 
            this.createCourseAttendanceSection(course)
        ).join('');
    }
    // This function creates the HTML for the attendance section of a specific course,
    // showing the attendance percentage and a list of sessions with their respective attendance status.
    createCourseAttendanceSection(course) {
        //FIXME: This might want to be changed to show more details about each session,
        //       or to pull data drom API.
        const sessionObj = this.sessions.filter(s => s.courseId === course.courseId);
        const totalSessions = sessionObj.length; 
        const qrObj = this.qrCodes.filter(q => sessionObj.some(s => s.sessionId === q.sessionId));
        const attendanceObj = this.attendance.filter(a => qrObj.some(q => q.code === a.code));
        const courseAttendance = attendanceObj.filter(a => a.sessionAttendance === 'PRESENT').length;
        const attendancePercentage = totalSessions > 0 ? Math.round((courseAttendance / totalSessions) * 100) : 0;
        
        const attendanceStatus = attendancePercentage >= 90 ? 'excellent' : 
                              attendancePercentage >= 80 ? 'good' : 
                              attendancePercentage >= 70 ? 'warning' : 'poor';

        return `
            <div class="attendance_class">
                <div class="class_summary">
                    <h4>${this.escapeHtml(course.courseName)} (${course.courseId})</h4>
                    <span class="attendance_percentage attendance_${attendanceStatus}">
                        ${attendancePercentage}%
                    </span>
                </div>
                <div class="attendance_dates">
                    ${qrObj.slice(0, 8).map(record => this.createAttendanceDate(record, attendanceObj)).join('')}
                    ${qrObj.length > 8 ? `
                        <div class="more_records" style="text-align: center; padding: 10px; color: #666;">
                            +${qrObj.length - 8} more records
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    // This function creates the HTML for a single attendance record,
    // showing the date and status (present, absent, late) for that session.
    createAttendanceDate(qrObj, attendanceObj) {
        const sessionObj = this.sessions.find(s => s.sessionId === qrObj.sessionId);
        const attendanceRecord = attendanceObj.find(a => a.code === qrObj.code);
        const date = new Date(sessionObj.date);
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
        }[attendanceRecord.sessionAttendance]
        
        return `
            <div class="attendance_date ${attendanceRecord.sessionAttendance.toLowerCase()}">
                <span>${formattedDate}</span>
                <span class="status ${attendanceRecord.sessionAttendance.toLowerCase()}">
                    <i class="fas ${statusIcon}"></i>
                    ${attendanceRecord.sessionAttendance.toLowerCase()}
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
    async openQRScanner() {
        document.getElementById('qr_scanner').classList.remove('hidden');
        const video = document.getElementById("qr_video");
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });
        video.srcObject = stream;

        await new Promise(resolve => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });

        const scannedData = this.currentUser.scanQRCode(video);
        this.processQRCheckIn(scannedData);
    }
    // Stop camera when closing scanner
    closeQRScanner() {
        const video = document.getElementById("qr_video");
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }        
        document.getElementById('qr_scanner').classList.add('hidden'); 
    }

    processQRCheckIn(scannedData) {
        const qrCodeObj = this.qrcode.find(qr => qr.code === scannedData);
        const session = this.sessions.find(s => s.sessionId === qrCodeObj.sessionId);
        const attendanceRecord = this.attendance.find(a => a.code === qrCodeObj.code && a.studentId === this.currentUser.id);
        if (session) {
            this.closeQRScanner();
            this.recordAttendance(attendanceRecord, 'PRESENT');
            document.getElementById('success_message').textContent = 
                `Checked in to ${session.courseId}`;
            this.showSuccessMessage();
        } else {
            alert('Invalid QR code. Please try again.');
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
        //const sessionActive = this.courses.find(s => {
        const code = document.getElementById('class_code').value.trim().toUpperCase();
        if (code) {
            const attendanceRecord = this.attendance.find(a => a.code === code && a.studentId === this.currentUser.id);
            if (session) {
                this.closeManualCheckIn();
                this.recordAttendance(attendanceRecord, 'PRESENT');
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

    recordAttendance(attendanceObj, status) {
        // Create new attendance record
        attendanceObj.sessionAttendance = status;        
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
        
        const course = this.courses.find(c => c.courseId === courseId);
        setTimeout(() => {
            document.getElementById('success_message').textContent = 
                `Ready to check in for ${course.courseName}`;
            this.openQRScanner();
        }, 500);
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