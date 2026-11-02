import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export interface SamplePaperSpec {
  fileName: string;
  paperName: string;
  year: string;
  subjectName: string;
  subjectCode: string;
  questions: Array<{
    qNum: string;
    text: string;
    marks: string;
  }>;
}

/**
 * Creates a formatted university exam question paper PDF
 */
export async function generateQuestionPaperPDF(spec: SamplePaperSpec, outputDir: string): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();
  let y = height - 50;

  // Header
  const title1 = 'VISVESVARAYA TECHNOLOGICAL UNIVERSITY, BELAGAVI';
  page.drawText(title1, {
    x: width / 2 - (timesBold.widthOfTextAtSize(title1, 12) / 2),
    y,
    size: 12,
    font: timesBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 20;

  const title2 = `Eighth Semester B.E. Degree Examination (${spec.year})`;
  page.drawText(title2, {
    x: width / 2 - (timesBold.widthOfTextAtSize(title2, 11) / 2),
    y,
    size: 11,
    font: timesBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 20;

  const subTitle = `${spec.subjectName.toUpperCase()} [${spec.subjectCode}]`;
  page.drawText(subTitle, {
    x: width / 2 - (timesBold.widthOfTextAtSize(subTitle, 13) / 2),
    y,
    size: 13,
    font: timesBold,
    color: rgb(0.05, 0.3, 0.35),
  });
  y -= 25;

  // Meta row
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 16;

  page.drawText('Time: 3 Hours', { x: 50, y, size: 10, font: timesBold });
  page.drawText(`Paper Code: ${spec.paperName}`, { x: width / 2 - 40, y, size: 10, font: timesRoman });
  page.drawText('Max. Marks: 100', { x: width - 130, y, size: 10, font: timesBold });
  y -= 12;

  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 20;

  // Instructions
  page.drawText('Note: 1. Answer any FIVE full questions, choosing ONE full question from each module.', {
    x: 50,
    y,
    size: 9.5,
    font: timesRoman,
    color: rgb(0.25, 0.25, 0.25),
  });
  y -= 25;

  // Questions
  for (const q of spec.questions) {
    if (y < 70) {
      // Avoid clipping bottom
      break;
    }

    const qPrefix = `${q.qNum}. `;
    page.drawText(qPrefix, {
      x: 50,
      y,
      size: 10.5,
      font: timesBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Wrap question text
    const maxWidth = width - 170;
    const words = q.text.split(' ');
    let currentLine = '';
    let lineY = y;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = timesRoman.widthOfTextAtSize(testLine, 10);
      if (testWidth > maxWidth) {
        page.drawText(currentLine, {
          x: 75,
          y: lineY,
          size: 10,
          font: timesRoman,
          color: rgb(0.1, 0.1, 0.1),
        });
        currentLine = word;
        lineY -= 15;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      page.drawText(currentLine, {
        x: 75,
        y: lineY,
        size: 10,
        font: timesRoman,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    // Draw marks on the right
    page.drawText(`[${q.marks}]`, {
      x: width - 95,
      y,
      size: 10,
      font: timesBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    y = lineY - 18;
  }

  // Footer
  page.drawLine({
    start: { x: 50, y: 40 },
    end: { x: width - 50, y: 40 },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.6),
  });
  page.drawText('Page 1 of 1', {
    x: width / 2 - 20,
    y: 28,
    size: 8.5,
    font: timesRoman,
    color: rgb(0.4, 0.4, 0.4),
  });

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(outputDir, spec.fileName);
  fs.writeFileSync(filePath, pdfBytes);
  return filePath;
}
