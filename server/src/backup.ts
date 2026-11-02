import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupPath = path.join(__dirname, '../backup_data.json');

async function backup() {
  console.log('Exporting all data from current SQLite database...');
  
  const subjects = await prisma.subject.findMany({
    include: {
      modules: {
        include: {
          questions: {
            include: {
              occurrences: true
            }
          }
        }
      },
      papers: true
    }
  });

  const questionOccurrences = await prisma.questionOccurrence.findMany();
  const questions = await prisma.question.findMany();
  const papers = await prisma.paper.findMany();
  const modules = await prisma.module.findMany();

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    counts: {
      subjects: subjects.length,
      modules: modules.length,
      papers: papers.length,
      questions: questions.length,
      occurrences: questionOccurrences.length
    },
    subjects,
    modules,
    papers,
    questions,
    occurrences: questionOccurrences
  };

  fs.writeFileSync(backupPath, JSON.stringify(exportPayload, null, 2), 'utf-8');
  console.log(`Backup completed successfully! Saved to: ${backupPath}`);
  console.log('Record counts:', exportPayload.counts);
}

backup()
  .catch(err => {
    console.error('Backup failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

