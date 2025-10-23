This is the basic code for the landing page of the Attendance Tracker.

It includes:

    - basic script.js 
    - shared-auth.js script to maximize reusability
    - basic styles.css
    - simple manifest.json file
    - sw.js (service worker to cache the pages)

    - index.html
        1. login fields
        2. Forgot Password link
        3. Passkey Placeholder
        4. register section (account type toggle)

    - reset_password.html
        1. reset link field (email required)
        2. should send an email with a link to create new password
        3. js file for this page

    - create_new_pass.html
        1. create new password/confirm new password
        2. js file for this page
    
    ------To test this, type this link in the browser------
    http://127.0.0.1:5500/AttendanceTrackerDraft/create_new_pass.html?token=demo_token_123&email=test@student.com


