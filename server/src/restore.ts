import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupPath = path.join(__dirname, '../backup_data.json');

function clean(str: string | null | undefined): string | null {
  if (str === null || str === undefined) return null;
  // Remove null characters (0x00) which are forbidden in Postgres UTF-8 text fields
  return str.replace(/\0/g, '').replace(/\u0000/g, '');
}

async function restore() {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found at ${backupPath}`);
  }

  const rawData = fs.readFileSync(backupPath, 'utf-8');
  const data = JSON.parse(rawData);

  console.log(`Starting migration to connected database...`);
  console.log(`Restoring from backup created at: ${data.exportedAt}`);

  // 1. Subjects
  console.log(`Restoring ${data.subjects.length} subjects...`);
  for (const s of data.subjects) {
    await prisma.subject.upsert({
      where: { id: s.id },
      update: {
        name: clean(s.name)!,
        subjectCode: clean(s.subjectCode),
        description: clean(s.description),
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt)
      },
      create: {
        id: s.id,
        name: clean(s.name)!,
        subjectCode: clean(s.subjectCode),
        description: clean(s.description),
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt)
      }
    });
  }

  // 2. Modules
  console.log(`Restoring ${data.modules.length} modules...`);
  for (const m of data.modules) {
    await prisma.module.upsert({
      where: { id: m.id },
      update: {
        subjectId: m.subjectId,
        moduleName: clean(m.moduleName)!,
        order: m.order,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt)
      },
      create: {
        id: m.id,
        subjectId: m.subjectId,
        moduleName: clean(m.moduleName)!,
        order: m.order,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt)
      }
    });
  }

  // 3. Papers
  console.log(`Restoring ${data.papers.length} papers...`);
  for (const p of data.papers) {
    const cleanedRawText = clean(p.rawExtractedText);
    await prisma.paper.upsert({
      where: { id: p.id },
      update: {
        subjectId: p.subjectId,
        paperName: clean(p.paperName)!,
        year: clean(p.year),
        uploadedFilePath: clean(p.uploadedFilePath)!,
        extractionStatus: clean(p.extractionStatus) || 'EXTRACTED',
        rawExtractedText: cleanedRawText,
        pageCount: p.pageCount,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      },
      create: {
        id: p.id,
        subjectId: p.subjectId,
        paperName: clean(p.paperName)!,
        year: clean(p.year),
        uploadedFilePath: clean(p.uploadedFilePath)!,
        extractionStatus: clean(p.extractionStatus) || 'EXTRACTED',
        rawExtractedText: cleanedRawText,
        pageCount: p.pageCount,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      }
    });
  }

  // 4. Questions
  console.log(`Restoring ${data.questions.length} questions...`);
  for (const q of data.questions) {
    await prisma.question.upsert({
      where: { id: q.id },
      update: {
        moduleId: q.moduleId,
        canonicalQuestionText: clean(q.canonicalQuestionText)!,
        isManual: q.isManual || false,
        createdAt: new Date(q.createdAt),
        updatedAt: new Date(q.updatedAt)
      },
      create: {
        id: q.id,
        moduleId: q.moduleId,
        canonicalQuestionText: clean(q.canonicalQuestionText)!,
        isManual: q.isManual || false,
        createdAt: new Date(q.createdAt),
        updatedAt: new Date(q.updatedAt)
      }
    });
  }

  // 5. Question Occurrences
  console.log(`Restoring ${data.occurrences.length} occurrences...`);
  for (const o of data.occurrences) {
    await prisma.questionOccurrence.upsert({
      where: {
        questionId_paperId: {
          questionId: o.questionId,
          paperId: o.paperId
        }
      },
      update: {
        originalQuestionText: clean(o.originalQuestionText)!,
        sourcePageNumber: o.sourcePageNumber,
        marks: clean(o.marks),
        createdAt: new Date(o.createdAt)
      },
      create: {
        id: o.id,
        questionId: o.questionId,
        paperId: o.paperId,
        originalQuestionText: clean(o.originalQuestionText)!,
        sourcePageNumber: o.sourcePageNumber,
        marks: clean(o.marks),
        createdAt: new Date(o.createdAt)
      }
    });
  }

  console.log('✅ ALL data migrated to Supabase PostgreSQL successfully!');
}

restore()
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
