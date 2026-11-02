import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from '../db.js';
import { extractTextFromPDF } from '../services/pdfParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${safeName}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

const router = Router();

// Upload multiple or single PDFs for a subject
router.post('/subjects/:subjectId/papers/upload', upload.array('files', 20), async (req, res) => {
  try {
    const { subjectId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No PDF files were uploaded' });
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Optional metadata provided per file (e.g., custom paper names or years)
    let metaList: any[] = [];
    if (req.body.metadata) {
      try {
        metaList = typeof req.body.metadata === 'string' ? JSON.parse(req.body.metadata) : req.body.metadata;
      } catch {
        metaList = [];
      }
    }

    const createdPapers = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const meta = metaList[i] || {};
      
      const paperName = meta.paperName || path.basename(file.originalname, path.extname(file.originalname)).replace(/_/g, ' ');
      const year = meta.year || extractYearFromFileName(file.originalname);

      // Perform initial text extraction
      let extractionStatus = 'EXTRACTED';
      let rawText = '';
      let pageCount = 1;
      let parsedQuestions: any[] = [];
      let usedOcr = false;

      try {
        const extraction = await extractTextFromPDF(file.path);
        rawText = (extraction.rawText || '').replace(/\0/g, '').replace(/\u0000/g, '');
        pageCount = extraction.pageCount;
        parsedQuestions = extraction.questions;
        usedOcr = extraction.usedOcr;
      } catch (err: any) {
        console.error('PDF extraction failed for', file.originalname, err);
        extractionStatus = 'FAILED';
        rawText = `Extraction Error: ${err.message}`;
      }

      const paper = await prisma.paper.create({
        data: {
          subjectId,
          paperName,
          year,
          uploadedFilePath: file.path,
          extractionStatus,
          rawExtractedText: rawText,
          pageCount
        }
      });

      createdPapers.push({
        ...paper,
        questions: parsedQuestions,
        usedOcr
      });
    }

    res.status(201).json(createdPapers);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to upload and process papers' });
  }
});

// Helper to deduce year from filename
function extractYearFromFileName(filename: string): string {
  const match = filename.match(/\b(20[0-2][0-9]|19[89][0-9])\b/);
  return match ? match[1] : '';
}

// Get extracted text of a paper
router.get('/papers/:id/extracted-text', async (req, res) => {
  try {
    const { id } = req.params;
    const paper = await prisma.paper.findUnique({
      where: { id },
      include: {
        occurrences: {
          include: {
            question: true
          }
        }
      }
    });

    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    const parsedQuestions = parseQuestionsAgain(paper.rawExtractedText || '');

    res.json({
      id: paper.id,
      paperName: paper.paperName,
      year: paper.year,
      pageCount: paper.pageCount,
      extractionStatus: paper.extractionStatus,
      rawText: paper.rawExtractedText,
      extractedQuestions: parsedQuestions,
      occurrencesCount: paper.occurrences.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get paper extracted text' });
  }
});

function parseQuestionsAgain(text: string) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const qStartRegex = /^(?:Q(?:uestion)?\.?\s*\d+\s*[\.\:\)]?|\b\d{1,2}\s*[\.\)\-]\s*(?:\([a-z]\)|[a-z]\))?|\([a-z]\)|[a-z]\))\s+/i;
  const questions: any[] = [];
  let current: any = null;

  for (const line of lines) {
    if (qStartRegex.test(line)) {
      if (current && current.length >= 10) questions.push(current);
      current = line;
    } else if (current) {
      current += ' ' + line;
    } else if (line.length > 25 && /^(explain|describe|what|how|why|differentiate|compare|write|discuss)/i.test(line)) {
      current = line;
    }
  }
  if (current && current.length >= 10) questions.push(current);
  return questions;
}

// Update paper metadata
router.put('/papers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { paperName, year } = req.body;

    const updated = await prisma.paper.update({
      where: { id },
      data: {
        paperName: paperName ? paperName.trim() : undefined,
        year: year !== undefined ? (year ? String(year).trim() : null) : undefined
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update paper' });
  }
});

// Delete paper
router.delete('/papers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const paper = await prisma.paper.findUnique({ where: { id } });

    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    // Attempt to remove physical file if it exists
    if (paper.uploadedFilePath && fs.existsSync(paper.uploadedFilePath)) {
      try {
        fs.unlinkSync(paper.uploadedFilePath);
      } catch (e) {
        console.warn('Could not delete physical file:', e);
      }
    }

    // Cascade delete in Prisma deletes paper and its QuestionOccurrences
    await prisma.paper.delete({ where: { id } });

    // Clean up any orphan questions that no longer have any occurrences
    const orphanQuestions = await prisma.question.findMany({
      where: {
        occurrences: { none: {} }
      }
    });

    if (orphanQuestions.length > 0) {
      await prisma.question.deleteMany({
        where: {
          id: { in: orphanQuestions.map(q => q.id) }
        }
      });
    }

    res.json({ message: 'Paper deleted successfully and repetition counts recalculated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete paper' });
  }
});

// Re-extract text or trigger OCR
router.post('/papers/:id/re-extract', async (req, res) => {
  try {
    const { id } = req.params;
    const { forceOcr } = req.body;

    const paper = await prisma.paper.findUnique({ where: { id } });
    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    if (!fs.existsSync(paper.uploadedFilePath)) {
      return res.status(400).json({ error: 'Original uploaded PDF file does not exist on disk' });
    }

    const extraction = await extractTextFromPDF(paper.uploadedFilePath, Boolean(forceOcr));

    const updated = await prisma.paper.update({
      where: { id },
      data: {
        rawExtractedText: (extraction.rawText || '').replace(/\0/g, '').replace(/\u0000/g, ''),
        pageCount: extraction.pageCount,
        extractionStatus: 'EXTRACTED'
      }
    });

    res.json({
      paper: updated,
      questions: extraction.questions,
      usedOcr: extraction.usedOcr
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to re-extract paper' });
  }
});

export default router;
