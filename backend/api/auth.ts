import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-geoquest-key-dev';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, level: user.level, xp: user.xp, coins: user.coins, rank: user.rank, accuracy: user.accuracy }, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, level: user.level, xp: user.xp, coins: user.coins, rank: user.rank, accuracy: user.accuracy }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/guest', async (req, res) => {
  try {
    const guestId = `guest_${Math.random().toString(36).substr(2, 9)}`;
    const user = await prisma.user.create({
      data: {
        name: `Guest ${guestId.substring(6)}`,
        email: `${guestId}@guest.geoquest.local`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${guestId}`,
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, level: user.level, xp: user.xp, coins: user.coins, rank: user.rank, accuracy: user.accuracy }, token });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ error: 'Internal server error', details: (error as Error).message });
  }
});

export default router;
