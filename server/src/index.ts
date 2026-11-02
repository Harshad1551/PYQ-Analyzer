import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import subjectsRouter from './routes/subjects.js';
import modulesRouter from './routes/modules.js';
import papersRouter from './routes/papers.js';
import questionsRouter from './routes/questions.js';
import seedRouter from './routes/seedRoute.js';
import { runSeed } from './seed.js';

dotenv.config();

// Prevent unhandled errors from terminating the process
process.on('unhandledRejection', (reason, promise) => {
  console.warn('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded PDFs statically
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/subjects', subjectsRouter);
app.use('/api', modulesRouter);
app.use('/api', papersRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/seed', seedRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend build in production if available
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Auto-seed initial sample data on first start if database is empty
app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  try {
    await runSeed(false);
  } catch (seedErr) {
    console.warn('Initial seed check error:', seedErr);
  }
});
