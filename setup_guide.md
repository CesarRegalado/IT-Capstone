# Setup Guide (Run This Project Yourself)

This guide shows you how to run the Attendance Tracker from a project folder on your own machine.

## 1. Prerequisites

- Node.js 20+ (or current LTS)
- npm
- A PostgreSQL database (We used Supabase Postgres)
- Python 3 (optional, used for simple local static hosting)

## 2. Open Project and Install Dependencies

From the project root:
run -
''bash
npm install
''

## 3. Then you'll want to create a `.env` in Project Root

Create a `.env` file in the root folder (same level as `package.json`) and add:

''env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require 
APP_BASE_URL=http://localhost:5173
EMAIL_MODE=console
RESEND_API_KEY=
MAIL_FROM=onboarding@resend.dev
PORT=3000
''

Notes:
- `DATABASE_URL` is required. We used supabase postgresql so yours may be different.
- `APP_BASE_URL` may need to be set as your actual ip and not localhost. (If you run into issues)
- `EMAIL_MODE=console` this makes verification/reset links happen in terminal so it's good for local testing.
- Use `EMAIL_MODE=resend` only after setting a valid `RESEND_API_KEY` and verified `MAIL_FROM`.

## 4. Apply Prisma and Generate Client

From project root run these commands:

''bash
npm run prisma:generate
npm run prisma:deploy
''

If you are actively changing schema locally, use:

''bash
npx prisma migrate dev --name your_change_name
''

## 5. Set Frontend API/Base URLs for Local

Edit `src/js/config.js`:

''js
window.API_BASE = "http://localhost:3000";
window.APP_BASE_URL = window.APP_BASE_URL || "http://localhost:5173";
''

## 6. Start Backend

From project root:

''bash
npm run dev
''

Backend runs on `http://localhost:3000`.

## 7. Start Frontend (Static Files)

Open a second terminal:

''bash
cd src
python -m http.server 5173
''

Frontend runs on `http://localhost:5173`.

Alternative frontend command:

''bash
npx serve src -l 5173
''

## 8. Test the App

Open:

- `http://localhost:5173` (login/register page)
- `http://localhost:5173/instructor-dashboard/instructor.html` (instructor dashboard)
- `http://localhost:5173/checkin.html` (student check-in page)

## 9. Optional: Real Email Verification / Reset

To send real emails:
- Make changes to `.env` folder:
  - `EMAIL_MODE=resend`
  - `RESEND_API_KEY=<your_key>`
  - `MAIL_FROM=<verified_sender@yourdomain.com>`
  - `APP_BASE_URL=<your real frontend URL>`
- Restart backend after env changes.

## 10. Deploy Notes (If Needed)

- Frontend is static (`src/`) and can be hosted on Amplify.
- Backend (`src/server.mjs`) should be hosted separately (We used Render).
- Ensure backend CORS allows your frontend domain.
- Ensure frontend `window.API_BASE` points to deployed backend URL.

## Troubleshooting

- If UI seems outdated after changes: hard refresh (`Ctrl + Shift + R`).
- If login or API calls fail: verify `window.API_BASE` in `src/js/config.js`.
- If CORS errors appear: add frontend origin in `src/server.mjs` allowed origins.
- If Prisma generate fails on Windows with `EPERM`: stop Node processes and retry.
- If phone QR testing fails locally: use LAN IP (`http://192.168.x.x:5173`) and check firewall/network.
