import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from './middleware';

const router = Router();
const prisma = new PrismaClient();

// GET /api/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const topUsers = await prisma.user.findMany({
      orderBy: { xp: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        avatar: true,
        level: true,
        xp: true,
        rank: true
      }
    });
    res.json(topUsers);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/achievements
router.get('/achievements', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { userId: req.user!.userId }
    });
    
    // In a real app we'd map this against a static list of all available achievements
    const allAchievements = [
      { id: '1', badge: 'World Traveler', description: 'Unlock Level 5', earned: false },
      { id: '2', badge: 'Geography Master', description: 'Reach Level 20', earned: false },
      { id: '3', badge: 'Speed Demon', description: 'Answer in under 5 seconds', earned: false },
      { id: '4', badge: '20 Correct Streak', description: 'Get 20 right in a row', earned: false }
    ];

    const result = allAchievements.map(a => ({
      ...a,
      earned: achievements.some(userAch => userAch.badge === a.badge)
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/challenges/daily
router.get('/challenges/daily', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // A real app would generate and store this daily. We return a mock challenge.
    res.json({
      title: "Today's Daily Challenge",
      description: "Answer 5 random AI questions correctly to earn a massive 500 XP bonus!",
      rewardXP: 500,
      rewardCoins: 200,
      completed: false // would check DB if this user already finished it today
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
