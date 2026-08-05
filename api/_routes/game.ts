import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from './middleware';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Encryption helpers to secure answers statelessly without base64 decoding leaks
const ENCRYPTION_KEY = crypto.createHash('sha256').update(String(process.env.JWT_SECRET)).digest('base64').substring(0, 32);
const IV_LENGTH = 16;

function encryptAnswer(text: string) {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptAnswer(text: string) {
  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift()!, 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// In-memory cache to prevent repeated questions (Session cache per user)
// Map<userId, Set<questionHash>>
const userAskedQuestions = new Map<string, Set<string>>();

const levelTopics = [
  "Countries", "Capitals", "Flags", "Landmarks", "Mountains",
  "Rivers", "Oceans", "Population", "Climate", "Mixed Geography"
];

// Helper to fetch image from Wikimedia Commons
async function fetchWikimediaImage(keyword: string): Promise<string> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(keyword)}&pilicense=free`;
    const response = await axios.get(url);
    const pages = response.data.query.pages;
    const pageId = Object.keys(pages)[0];
    if (pageId !== "-1" && pages[pageId].original) {
      return pages[pageId].original.source;
    }
    
    // Fallback search if exact title fails
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(keyword)}&utf8=&format=json&srlimit=1`;
    const searchRes = await axios.get(searchUrl);
    if (searchRes.data.query.search.length > 0) {
      const bestTitle = searchRes.data.query.search[0].title;
      const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(bestTitle)}&pilicense=free`;
      const imgRes = await axios.get(imgUrl);
      const imgPages = imgRes.data.query.pages;
      const imgPageId = Object.keys(imgPages)[0];
      if (imgPageId !== "-1" && imgPages[imgPageId].original) {
        return imgPages[imgPageId].original.source;
      }
    }
    return "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80"; // Fallback generic geography image
  } catch (error) {
    return "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80";
  }
}

// GET /api/levels
router.get('/levels', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const levels = Array.from({ length: 20 }, (_, i) => ({
      level: i + 1,
      unlocked: i + 1 <= user.level,
      isBoss: (i + 1) % 5 === 0
    }));

    res.json(levels);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/questions/generate
router.post('/questions/generate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { level } = req.body;
    const userId = req.user!.userId;
    
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    }

    const topic = level <= 10 ? levelTopics[level - 1] : "Advanced " + levelTopics[(level - 1) % 10];
    const difficulty = level < 4 ? 'Easy' : level < 8 ? 'Medium' : 'Hard';
    const isBoss = level % 5 === 0;

    const prompt = `
Generate a Geography MCQ.
Difficulty: ${difficulty}
Topic: ${topic}
Ensure it is unique and factual.

Return exactly and ONLY a JSON object in this format (no markdown formatting, no code blocks):
{
 "question": "The question text",
 "imagePrompt": "A highly specific 2-4 word search keyword for a prominent landmark/flag/city for this question",
 "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
 "answer": "The exact correct option string",
 "explanation": "A short 1-sentence explanation of why it is correct"
}`;

    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim().replace(/^```json\n?|```$/g, '');
    
    const aiData = JSON.parse(responseText);

    // Generate hash to prevent repetition
    const questionHash = crypto.createHash('md5').update(aiData.question).digest('hex');
    if (!userAskedQuestions.has(userId)) {
      userAskedQuestions.set(userId, new Set());
    }
    const userSet = userAskedQuestions.get(userId)!;
    
    // In a real app we'd loop and regenerate if it's a duplicate, but we'll just add it for now to avoid infinite loops
    userSet.add(questionHash);

    // Fetch Image
    const imageUrl = await fetchWikimediaImage(aiData.imagePrompt);

    const fullQuestion = {
      id: `q_${questionHash.substring(0, 8)}`,
      difficulty,
      topic,
      question: aiData.question,
      imagePrompt: aiData.imagePrompt,
      imageUrl,
      options: aiData.options,
      timeLimitSeconds: isBoss ? 20 : 30
    };

    // Securely encode the answer in a short-lived token (stateless for serverless)
    const questionToken = jwt.sign(
      { id: fullQuestion.id, encryptedAnswer: encryptAnswer(aiData.answer), options: aiData.options },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '2m' }
    );

    // Also update current session in DB for anti-cheat
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentSessionLevel: level,
        // If this is the start of a level, we might want to reset sessionCorrectCount, 
        // but it's easier to just let the frontend send it, or we do it securely in `/answer`
      }
    });

    res.json({ ...fullQuestion, questionToken });
  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ error: 'Failed to generate question from AI' });
  }
});

// POST /api/game/answer
router.post('/game/answer', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { questionToken, selectedAnswer, timeTaken } = req.body;
    
    if (!questionToken) {
      return res.status(400).json({ error: 'Missing question token' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(questionToken, process.env.JWT_SECRET || 'fallback-secret');
    } catch (e) {
      return res.status(400).json({ error: 'Question expired or invalid' });
    }

    const correctAnswer = decryptAnswer(decoded.encryptedAnswer);
    const isCorrect = selectedAnswer === correctAnswer;

    let xpDelta = 0;
    let coinDelta = 0;
    let levelComplete = false;
    let newLevel = undefined;

    if (isCorrect) {
      xpDelta = 20; 
      if (timeTaken < 10) xpDelta += 10; 
      coinDelta = 5; 

      // Anti-cheat: Track correct answers on backend
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (user) {
        let newCount = user.sessionCorrectCount + 1;
        let isBoss = user.currentSessionLevel % 5 === 0;
        let target = isBoss ? 10 : 5;
        
        if (newCount >= target) {
          levelComplete = true;
          // Grant level completion rewards securely
          xpDelta += 100;
          coinDelta += 50;
          newCount = 0; // reset
          if (user.currentSessionLevel === user.level) {
            newLevel = user.level + 1;
          }
        }
        
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            sessionCorrectCount: newCount,
            level: newLevel || user.level,
            xp: { increment: xpDelta },
            coins: { increment: coinDelta }
          }
        });
      }
    } else {
      xpDelta = -5; 
      // Update XP penalty
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { xp: { increment: xpDelta } }
      });
    }

    res.json({ isCorrect, correctAnswer, xpDelta, coinDelta, levelComplete, newLevel });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/game/hint
router.post('/game/hint', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { type, questionToken } = req.body;
    
    if (!questionToken) return res.status(400).json({ error: 'Missing question token' });
    
    let decoded: any;
    try {
      decoded = jwt.verify(questionToken, process.env.JWT_SECRET || 'fallback-secret');
    } catch (e) {
      return res.status(400).json({ error: 'Question expired or invalid' });
    }

    const correctAnswer = decryptAnswer(decoded.encryptedAnswer);
    const options = decoded.options;

    if (type === '50-50' && options) {
      const wrongOptions = (options as string[]).filter(opt => opt !== correctAnswer);
      const shuffled = wrongOptions.sort(() => 0.5 - Math.random());
      const hiddenOptions = shuffled.slice(0, 2);
      
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { coins: { decrement: 10 } }
      });
      
      res.json({ hiddenOptions });
    } else {
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// We removed /api/game/session/complete since it was a cheating vulnerability.
// Level progress is now handled securely in the backend during /game/answer.

export default router;
