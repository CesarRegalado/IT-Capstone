export default class Session {
    constructor(
        sessionId,
        courseId,
        date = new Date().toLocaleDateString('en-US'),
        startTime = new Date().toLocaleTimeString()
    ) {
        this.sessionId = sessionId;
        this.courseId = courseId;
        this.date = date;
        this.startTime = startTime;
    }

    createSession() {
        // create new session for course,
        // when generated attendance record will be made for each student
        // qrcode will be generated automatically
    };
}