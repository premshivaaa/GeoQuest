# GeoQuest AI

An AI-powered, level-based geography quiz game where players answer increasingly difficult, dynamically generated geography questions. Built to showcase a full-stack, AI-native web app deployment on Vercel.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS v4, Framer Motion, Zustand, React Router
- **Backend**: Node.js, Express, Prisma ORM
- **Database**: MongoDB
- **AI**: Google Gemini (`gemini-3.5-flash`)
- **Images**: Wikimedia Commons API

## Features
- **Progression-Based Gameplay**: 20 levels ranging from Countries and Capitals to Oceans and AI-hard Mixed Geography.
- **Dynamic AI Questions**: Every question is generated on the fly by Gemini; no static question banks.
- **Real-Time Image Lookups**: AI-generated keywords are securely mapped to real, free Wikimedia Commons images.
- **Progression Mechanics**: Lives, Hint Systems (50-50, Skip, Extra Time), XP/Coin economy, and Level Bosses.
- **Engagement**: Leaderboards, Achievements, and Daily Challenges.
- **Admin Panel**: Manage users and view platform-wide stats.

## Setup Instructions

1. **Prerequisites**
   - Node.js (v18+)
   - A MongoDB URI (e.g., from MongoDB Atlas or local)
   - A Google Gemini API Key

2. **Configure Environment Variables**
   Navigate to the `backend` folder and edit the `.env` file with your credentials:
   ```env
   DATABASE_URL="mongodb://..."
   JWT_SECRET="your_secure_secret"
   GEMINI_API_KEY="your_gemini_api_key"
   PORT=3001
   ```

3. **Install Dependencies**
   The project is structured as a monorepo. You need to install dependencies in both the `frontend` and `backend` directories.
   ```bash
   cd backend
   npm install
   
   cd ../frontend
   npm install
   ```

4. **Initialize Database**
   ```bash
   cd backend
   npx prisma generate
   ```

5. **Run Locally**
   Start both the backend and frontend dev servers.
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   npm run start # You might need to add a start script, or use ts-node
   # Alternatively: npx nodemon api/index.ts
   ```
   
   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```

## Deployment (Vercel)
This project is configured out-of-the-box for a unified Vercel deployment.
1. Connect your repository to Vercel.
2. Vercel will automatically read the `vercel.json` at the root.
3. Add your `DATABASE_URL`, `JWT_SECRET`, and `GEMINI_API_KEY` to your Vercel Environment Variables.
4. Deploy! Traffic to `/api/*` will automatically be routed to the Express backend serverless functions, and all other traffic serves the Vite frontend.
