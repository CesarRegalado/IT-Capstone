import User from "./users.js";

export default class Instructor extends User {
    constructor(
        instructorId,
        firstName,
        lastName,
        UNTemail,
        role,
        password,
        coursesTaught = []
    ){
        super(instructorId, firstName, lastName, UNTemail, role, password);
        this.instructorId = instructorId;
        this.coursesTaught = coursesTaught; 
    }
    generateQRCode() {};    
    manualCheckIn() {};
    viewAttendance() {};
    exportAttendance() {};
}