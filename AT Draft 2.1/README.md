Redone Draft with working PWA installation and user dashboards.
Test data/simulations/hardcoded authentication to be removed.

It's operating as a Single Page Application (SPA) to reduce the amount
of HTML pages and make the user experience more "seamless". Also useful
for the PWA design for mobile users.

Using only basic HTML, JS, and CSS. 

Service worker for website caching for offline use, faster loading, and PWA.
**optional notification features could be added
**optional session duration calculation code


    - TEST USER CREDENTIALS IN LANDING PAGE FOR TEST PURPOSES ONLY. -
    - ADDED CHECK IN SIMULATION FOR TESTING. -
    - ADDED SAMPLE CLASS CODE GENERATION -
    - ADDED TEMPORARY SESSION STORAGE (DATABASE SIMULATION FOR TESTING) -

It includes:

    - icons folder with 2 temporary icons for testing purposes
    - Student Dashboard contents
    - Instructor Dashboard contents
    - basic script.js 
    - shared-auth.js script to maximize reusability
    - basic styles.css
    - Service worker (sw.js) 
    - Student test data for testing purposes
    - Instructor test data for testing purposes
    - manifest json file 
    - separate css for dashboards and landing page


    - index.html
        1. login fields
        2. Forgot Password link
        3. Passkey Placeholder (hardcoded to work in script.js)
        4. register section (account type toggle)

    - reset_password.html
        1. reset link field (email required)
        2. should send an email with a link to create new password
        3. js file for this page

    - create_new_pass.html
        1. create new password/confirm new password
        2. js file for this page

Student-Dashboard
    - QR code and clas code check in capability
    - Keeps data about attendance history (present, late, absent)
    - Classes section (with test data, it shows class info)
    and has option to check in through that screen as well
    - Attendance: Shows attendance records (can access it through the menu or via the button in the classes section)
    - Personalized welcome message at login. Name in dashboard
    - Logout message/confirm

Instructor-Dashboard
    - Course management (add, edit, delete course)
    - Session management
    - Report view/export
    - Export in TXT or CSV (default format is csv for individual sessions)
    - Export all/export course/export session
    - Manual student check-in
    - Real time check-in response and simulation
    - "Projector view": separate page for QR/Class code display
    - Added reload/navigation state management
 PWA
    - Working PWA button (works in Chrome as of now)
       
Passkey
    - Working passkey function (hardcoded to work for testing purposes - for student login)
    - WebAuth is required for it to work in production

    
TESTING
    - Included test data to check layout/info/check in simulation
    - User/Course/student/instructor information for testing
    - Hardcoded test user info (TO BE REMOVED) in script and index for login, register, welcome message, student portal, instructor portal and passkey
    - Simulated QR code Scanning (WE NEED TO CHANGE THAT)
    - Hardcoded Passkey info (TO BE REMOVED) in index
    - Simulated Check in (FOR TESTING)





