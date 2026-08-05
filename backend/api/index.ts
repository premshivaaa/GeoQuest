import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

import authRouter from './auth';
import gameRouter from './game';
import engagementRouter from './engagement';
import adminRouter from './admin';

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'GeoQuest AI Backend is running' });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api', gameRouter);
app.use('/api', engagementRouter);
app.use('/api/admin', adminRouter);

// For local dev if run directly
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running locally on port ${PORT}`);
  });
}

// Export for Vercel Serverless
export default app;
