export default class Attendance {
    constructor(
        attendanceId,
        studentId,
        code,
        sessionAttendance
    ) {
        this.attendanceId = attendanceId;
        this.studentId = studentId;
        this.code = code;
        this.sessionAttendance = sessionAttendance;
    }

    isPresent() {
        return this.sessionAttendance;
    };
    recordAttendance() {
        // updates attendance record for student record should 
        // automatically be made for student when session starts 
        // with status 'null'
    };
    preventDuplicateEntry() {
        // checks if attendance record is null before recording attendance
        // if not null then student has already checked in
    };
    updateAttendance() {};
    getAttendanceReport(studentId/* or courseId maybe*/) {
        // returns attendance records for student (or course maybe)
    };
}