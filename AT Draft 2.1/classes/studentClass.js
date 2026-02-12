import User from "./users.js";

export default class Student extends User {
    constructor(
        studentId,
        firstName,
        lastName,
        UNTemail,
        role,
        password,
        coursesEnrolled = []
    ) {
        super(studentId, firstName, lastName, UNTemail, role, password);
        this.studentId = studentId;
        this.coursesEnrolled = coursesEnrolled;
    }
    scanQRCode(videoElement) {
        const canvas = document.getElementById("qr_canvas");
        const context = canvas.getContext("2d");
        let scanning = true;
        console.log('Starting QR code scan...');
        const scan = () => {
            if (!scanning) return;

            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                scanning = false;
                console.log('QR code detected:', code.data);
                return code.data;
            }else {
                requestAnimationFrame(scan);
            }
        };
        scan();
        
    };
    updateProfile() {
        // allow student to update profile information except for userID
    };
}