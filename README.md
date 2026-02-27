# Attendance Tracker

RTO compliance tracker using a "Best 8 of Last 12 weeks" (BELT) average. Built with React + Firebase, deployed to GitHub Pages.

## Quick Start

```bash
npm install    # first time only
npm run dev    # start local dev server (http://localhost:5173)
```

## Project Structure

```
src/
  App.jsx                  # Auth gate — routes to SignIn or tracker
  SignIn.jsx               # Google sign-in page
  attendance-tracker.jsx   # Main tracker UI (BELT calc, weekly log, simulator)
  useAttendance.js         # Firestore data hook (fetch/save weekly attendance)
  firebase.js              # Firebase config + init
  main.jsx                 # React entry point
```

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via GitHub Actions.

Live site: `https://kaspii.github.io/attendance/`

## Firebase

- **Auth**: Google sign-in, restricted to allowlisted emails (see `ALLOWED_EMAILS` in `App.jsx`)
- **Firestore**: Data stored at `users/{uid}/weeks/{weekId}`
- **Console**: [console.firebase.google.com](https://console.firebase.google.com) (project: `attendance-da972`)

## Key Config Locations

| What | Where |
|------|-------|
| Firebase credentials | `src/firebase.js` |
| Allowed users | `ALLOWED_EMAILS` in `src/App.jsx` |
| GH Pages base path | `base` in `vite.config.js` |
| Deploy workflow | `.github/workflows/deploy.yml` |
