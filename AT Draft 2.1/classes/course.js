export default class Course {
    constructor(
        courseId,
        courseName,
        weekDays, /*'M','Tu','W','Th','F','Sat'*/
        startTime,
        instructorID
    ) {
    this.courseId = courseId;
    this.courseName = courseName;
    this.weekDays = weekDays;
    this.startTime = startTime;
    this.instructorID = instructorID;
    }
    createSession(){
        // if possible schedule session to open automatically at start time 
        // create new sessiion for course,  
        // when generated attendance record will be made for each student
    };
    removeSession(){
        // delete session and qr code and attendance records for session
    };
    modifySession(){
        // change start time
    };
}