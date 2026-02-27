# Nappi - User Help

This repository is the **merged submission repo** (Backend + Frontend + IoT/Monitoring code) prepared for review.

## Option 1 - Run the deployed demo
No installation required.

1. Open: https://nappi-backend.onrender.com/docs  
   This wakes up our backend (deployed on Render free-tier).  
   Once it loads and you see the FastAPI Swagger UI, the backend is running.
2. Open: https://nappi-frontend.vercel.app/  
   (If step 1 is skipped, login attempts may appear as if the credentials are wrong)
3. Sign in with one of the demo users:

- **demo@nappi.app** / **demo123** (baby: *Emma Cohen*, 3mo)
- **david@nappi.app** / **david123** (baby: *Noah Levy*, 7mo)
- **maya@nappi.app** / **maya123** (baby: *Mia Ben-David*, 14mo)

> Note: The backend is deployed on Render, and the production frontend is hosted on Vercel.

---

## Option 2 - Clone the repo to review the code (no env files)
This option is meant for **code review**.

### 1) Clone
```bash
git clone <REPO_URL>
cd <REPO_FOLDER>
2) Where the code is

Inside the Code/ folder:

Backend/ — FastAPI backend

Frontend/ — React + TypeScript frontend

Monitor/ — IoT / monitoring side (M5Stack + UnitV2 camera)
```
### Note

We do not include environment files in this repo.
In our deployment, the backend environment variables were set directly in the hosting platform (Render).

So, running locally is not expected to work out-of-the-box without setting your own credentials (DB / Gemini key / etc.).
