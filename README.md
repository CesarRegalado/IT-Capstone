IT-Capstone Attendance Tracker (Working Branch)

Attendance tracking web app for instructors with QR-based student check-in.

new working version with real backend + database connections for the core instructor workflow.

Working Features
- Instructor registration (db-backed)
- Instructor login (db-backed)
- Email verification token flow for new instructor accounts
- Password reset token flow (forgot password + reset link)
- Create course/class (saved to database)
- Delete course/class (deletes from database, including related sessions/attendance)
- Course schedule persistence (days, time, location saved in db)
- Start attendance session
- End attendance session
- Projector/session page with generated QR code
- Public student check-in page (`checkin.html`)
- Student check-in by:
  - session code
  - student ID
  - first/last name
- Attendance records saved to database
- Instructor live attendance updates
- Attendance/report viewing after logout/login
- CSV/TXT export (existing instructor dashboard export flow)

Main Workflow ()

1. Instructor registers account
2. Instructor logs in
3. Instructor creates classes
4. Instructor starts attendance session (QR/code generated)
5. Student scans QR and opens public check-in page
6. Student enters student ID + name and submits
7. Instructor sees attendance update live
8. Instructor ends session
9. Instructor can review/export reports later

Architecture (Current)

Frontend (Static)
- Hosted as static files from `src/`
- Main pages:
  - `src/index.html` (login/register)
  - `src/instructor-dashboard/instructor.html`
  - `src/instructor-dashboard/session.html` (projector/QR page)
  - `src/checkin.html` (public check-in page)

Backend API
- `src/server.mjs` (Express + Prisma)


Deployment Notes

Amplify - Frontend
- `amplify.yml` publishes `src` as the site root.
- Amplify deploys frontend only (static files).
- Backend code in the repo does not get deployed by Amplify unless build config explicitly does so.

Render - Backend
- Backend (`src/server.mjs`) deployed separately
- Frontend `API_BASE` points to the deployed backend URL.
- Backend CORS must include the Amplify domain(s).

Current Scope Decisions

PWA
- PWA/install support remains in the project (optional feature).
- Not required for the core attendance workflow.

Known Limitations / Future Improvements
- Email delivery provider requires configuration (`EMAIL_MODE=resend` + API key)
- Passkey/WebAuthn is removed from active UI (future enhancement only)
- Local phone testing may require LAN IP + firewall/CORS configuration

Environment Variables (Email/Auth)
- `DATABASE_URL` - Postgres connection string
- `APP_BASE_URL` - Frontend base URL used in verification/reset links (example: `http://localhost:5173` or Amplify URL)
- `EMAIL_MODE` - `console` (default, logs links) or `resend` (sends real emails)
- `RESEND_API_KEY` - Required when `EMAIL_MODE=resend`
- `MAIL_FROM` - Verified sender address for email provider


Tech Stack
- HTML / CSS / Vanilla JS
- Express
- Prisma
- Supabase Postgres
- AWS Amplify (frontend hosting)
- Render (backend hosting, planned/current)
