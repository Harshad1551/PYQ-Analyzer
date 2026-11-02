import fs from 'fs';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';

export interface ExtractedQuestionItem {
  id: string;
  originalText: string;
  cleanedText: string;
  pageNumber: number;
  marks?: string;
}

export interface PDFExtractionResult {
  rawText: string;
  pageCount: number;
  isScannedOrSparse: boolean;
  usedOcr: boolean;
  questions: ExtractedQuestionItem[];
}

/**
 * Filter out university exam headers, instructions, and non-question boilerplate
 */
function isBoilerplateLine(line: string): boolean {
  const lower = line.toLowerCase().trim();
  if (lower.length === 0) return true;
  
  // Headers & metadata
  if (/^(time|duration)\s*[:：\-]/i.test(lower)) return true;
  if (/^(max\.?\s*marks?|total\s*marks?)\s*[:：\-]/i.test(lower)) return true;
  if (/^(usn|roll\s*no|register\s*no)\s*[:：\-]/i.test(lower)) return true;
  if (/^(semester|sem|b\.?e|b\.?tech|m\.?tech|dept|department)\b/i.test(lower)) return true;
  if (/^(note|instructions?)\s*[:：\-]/i.test(lower)) return true;
  if (/^answer\s+any\s+(five|four|all|[0-9]+)\s+full\s+questions/i.test(lower)) return true;
  if (/^answer\s+all\s+questions/i.test(lower)) return true;
  if (/^part\s*[-–—]?\s*[a-z0-9]/i.test(lower)) return true;
  if (/^module\s*[-–—]?\s*[0-9]/i.test(lower)) return true;
  if (/^page\s*\d+\s*(of\s*\d+)?$/i.test(lower)) return true;
  if (/^(\*{3,}|_{3,}|={3,}|-{3,})$/.test(lower)) return true;
  if (/^or\s*$/i.test(lower)) return true;

  return false;
}

/**
 * Extract questions from plain text of a question paper
 */
export function parseQuestionsFromText(text: string): ExtractedQuestionItem[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const questions: ExtractedQuestionItem[] = [];
  
  // Regex pattern matching question starts:
  // e.g. "Q1.", "Q.1", "1.", "1)", "1 -", "1. (a)", "a)", "(a)", "Q1 a)"
  const qStartRegex = /^(?:Q(?:uestion)?\.?\s*\d+\s*[\.\:\)]?|\b\d{1,2}\s*[\.\)\-]\s*(?:\([a-z]\)|[a-z]\))?|\([a-z]\)|[a-z]\))\s+/i;
  
  // Pattern to extract marks at end or in text: e.g. [8M], (10 Marks), [08 Marks], [10]
  const marksRegex = /(?:\[|\()(\d{1,2})\s*(?:marks?|m)?(?:\]|\))$/i;

  let currentQuestion: { text: string; page: number } | null = null;
  let currentPage = 1;

  for (const line of lines) {
    // Check for page markers
    const pageMatch = line.match(/--- Page (\d+) ---/i) || line.match(/Page\s+(\d+)\s+of\s+\d+/i);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10) || currentPage;
      continue;
    }

    if (isBoilerplateLine(line)) {
      continue;
    }

    const isQuestionStart = qStartRegex.test(line);

    if (isQuestionStart) {
      if (currentQuestion && currentQuestion.text.trim().length >= 15) {
        questions.push(formatQuestionItem(currentQuestion.text.trim(), currentQuestion.page, marksRegex));
      }
      currentQuestion = {
        text: line,
        page: currentPage
      };
    } else {
      if (currentQuestion) {
        currentQuestion.text += ' ' + line;
      } else {
        if (line.length > 25 && /^(explain|describe|what|how|why|differentiate|compare|write|discuss|illustrate|state|define)/i.test(line)) {
          currentQuestion = {
            text: line,
            page: currentPage
          };
        }
      }
    }
  }

  // Push last question
  if (currentQuestion && currentQuestion.text.trim().length >= 15) {
    questions.push(formatQuestionItem(currentQuestion.text.trim(), currentQuestion.page, marksRegex));
  }

  return questions;
}

function formatQuestionItem(rawText: string, pageNumber: number, marksRegex: RegExp): ExtractedQuestionItem {
  let cleaned = rawText;
  let marks: string | undefined = undefined;

  const marksMatch = cleaned.match(marksRegex);
  if (marksMatch) {
    marks = `${marksMatch[1]} Marks`;
    cleaned = cleaned.replace(marksRegex, '').trim();
  }

  const strippedText = cleaned
    .replace(/^(?:Q(?:uestion)?\.?\s*\d+\s*[\.\:\)]?|\b\d{1,2}\s*[\.\)\-]\s*(?:\([a-z]\)|[a-z]\))?|\([a-z]\)|[a-z]\))\s*/i, '')
    .trim();

  return {
    id: `ext_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    originalText: rawText.trim(),
    cleanedText: strippedText.length >= 8 ? strippedText : rawText.trim(),
    pageNumber,
    marks
  };
}

/**
 * Extracts embedded JPEG images from a scanned PDF buffer
 */
function extractEmbeddedJpegs(buffer: Buffer): Buffer[] {
  const images: Buffer[] = [];
  let startIndex = 0;

  while (startIndex < buffer.length) {
    const soi = buffer.indexOf(Buffer.from([0xFF, 0xD8, 0xFF]), startIndex);
    if (soi === -1) break;

    const eoi = buffer.indexOf(Buffer.from([0xFF, 0xD9]), soi + 3);
    if (eoi === -1) break;

    const jpegBuffer = buffer.subarray(soi, eoi + 2);
    // Scanned page images are generally > 5KB
    if (jpegBuffer.length > 5120) {
      images.push(jpegBuffer);
    }
    startIndex = eoi + 2;
  }

  return images;
}

/**
 * Main PDF text extractor with crash-proof OCR fallback
 */
export async function extractTextFromPDF(filePath: string, forceOcr = false): Promise<PDFExtractionResult> {
  const dataBuffer = fs.readFileSync(filePath);
  let rawText = '';
  let pageCount = 1;
  let usedOcr = false;

  // 1. Primary extraction via pdf-parse
  if (!forceOcr) {
    try {
      const pdfData = await pdfParse(dataBuffer);
      rawText = pdfData.text || '';
      pageCount = pdfData.numpages || 1;
    } catch (err) {
      console.warn('PDF-parse text extraction warning:', err);
    }
  }

  // 2. Check if text is completely empty or sparse
  const cleanedChars = rawText.replace(/\s+/g, ' ').trim();
  const isSparse = cleanedChars.length < 30 * pageCount;

  // 3. If sparse or forceOcr, attempt OCR on embedded images
  if ((isSparse || forceOcr) && fs.existsSync(filePath)) {
    try {
      const embeddedImages = extractEmbeddedJpegs(dataBuffer);

      if (embeddedImages.length > 0) {
        console.log(`PDF contains ${embeddedImages.length} scanned image(s). Running OCR...`);
        usedOcr = true;
        
        let worker: any = null;
        try {
          worker = await createWorker('eng');
          let ocrAccumulatedText = '';

          for (const imgBuffer of embeddedImages) {
            try {
              const res = await worker.recognize(imgBuffer);
              if (res && res.data && res.data.text) {
                ocrAccumulatedText += '\n' + res.data.text;
              }
            } catch (pageOcrErr) {
              console.warn('OCR error on scanned page image:', pageOcrErr);
            }
          }

          if (ocrAccumulatedText.trim().length > rawText.trim().length) {
            rawText = ocrAccumulatedText;
          }
        } finally {
          if (worker) {
            try {
              await worker.terminate();
            } catch {}
          }
        }
      } else {
        // No embedded image stream found, cannot run raster OCR directly on PDF container
        if (isSparse) {
          console.log('PDF has sparse text and no embedded JPEG raster images for direct OCR.');
        }
      }
    } catch (ocrErr) {
      console.warn('OCR pipeline safely handled notice:', ocrErr);
    }
  }

  const questions = parseQuestionsFromText(rawText);

  return {
    rawText,
    pageCount,
    isScannedOrSparse: isSparse,
    usedOcr,
    questions
  };
}
