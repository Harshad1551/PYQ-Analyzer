import { Router } from 'express';
import { runSeed } from '../seed.js';
import { prisma } from '../db.js';

const router = Router();

router.post('/demo', async (req, res) => {
  try {
    const subject = await runSeed(true);
    res.json({ message: 'Demo dataset loaded successfully', subject });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to seed demo data' });
  }
});

router.post('/reset', async (req, res) => {
  try {
    await prisma.questionOccurrence.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.paper.deleteMany({});
    await prisma.module.deleteMany({});
    await prisma.subject.deleteMany({});
    res.json({ message: 'All database records cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reset database' });
  }
});

export default router;
