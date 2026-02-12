export default class User {
    constructor(
        userId, 
        firstName,
        lastName, 
        UNTemail,
        role,
        password
    ) {
        this.userId = userId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.UNTemail = UNTemail;
        this.role = role;
        this.password = password; // This is a hashed password
    }
    // Use this to push user data to the databse when implemented, currently pushes to testDB for testing purposes
    registerUser(){
        //FIXME: This is currently pushing to the testDB instead of DATABASE
        testDB.usersArr.push(this);
        // create Instrustor or Student based on role and push to respective array
        if (this.role === 'instructor') {
            testDB.instructorsArr.push(this);
        } else if (this.role === 'student') {
            testDB.studentsArr.push(this);
        }
        console.log('User registered:', this);
    };

    userLogin(){
        try {
            // Store user session based on role
            if (this.role === 'instructor') {
                setTimeout(() => {
                    window.location.href = 'instructor-dashboard/instructor.html';
                }, 1000);
            } else if (this.role === 'student') {
                sessionStorage.setItem('currentStudent', JSON.stringify(this));
                setTimeout(() => {
                    window.location.href = 'student-dashboard/student.html';
                }, 1000);
            } else {
                return false;
            }
            return true;
            
        } catch (error) {
            console.error('Login redirect error:', error);
            return false;
        }
    };
/*
    updateProfile(){};*/
}
