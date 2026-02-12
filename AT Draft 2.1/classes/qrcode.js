export default class qrcode {
    constructor(
        code,
        sessionId,
    ) {
        this.code = code;
        this.sessionId = sessionId;
    }

    generateQRCode() {
        // creates code should be code + datetime of session
        // attendace records made for students enrolled in course, with status 'null' and code for session
    };
    verifyQRCode() {
        // checks if code is valid and not expired
    };
    recordAttendance() {
        // updates attendance record for student
    };
}