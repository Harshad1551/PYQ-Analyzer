import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from './db.js';
import { generateQuestionPaperPDF } from './services/pdfGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export async function runSeed(force = false) {
  const existing = await prisma.subject.findFirst({
    where: { name: 'Big Data Analytics' }
  });

  if (existing && !force) {
    console.log('Sample subject already exists. Skipping seed.');
    return existing;
  }

  if (existing && force) {
    await prisma.subject.delete({ where: { id: existing.id } });
  }

  console.log('Seeding Big Data Analytics subject with 8 papers and 5 modules...');

  // 1. Create Subject
  const subject = await prisma.subject.create({
    data: {
      name: 'Big Data Analytics',
      subjectCode: '18CS81',
      description: 'Department of Computer Science & Engineering - VTU 8th Sem Examination Question Papers'
    }
  });

  // 2. Create 5 Modules
  const moduleData = [
    { name: 'Module 1: Introduction to Big Data', order: 1 },
    { name: 'Module 2: Hadoop and MapReduce', order: 2 },
    { name: 'Module 3: NoSQL Databases', order: 3 },
    { name: 'Module 4: Data Analytics', order: 4 },
    { name: 'Module 5: Data Visualization', order: 5 }
  ];

  const modules: Record<number, any> = {};
  for (const m of moduleData) {
    const created = await prisma.module.create({
      data: {
        subjectId: subject.id,
        moduleName: m.name,
        order: m.order
      }
    });
    modules[m.order] = created;
  }

  // 3. Define 8 Papers
  const paperSpecs = [
    { name: 'June/July 2018 Paper', year: '2018', file: 'BDA_JunJul_2018.pdf' },
    { name: 'Dec 2018 / Jan 2019 Paper', year: '2019', file: 'BDA_DecJan_2019.pdf' },
    { name: 'June/July 2019 Paper', year: '2019', file: 'BDA_JunJul_2019.pdf' },
    { name: 'Dec 2019 / Jan 2020 Paper', year: '2020', file: 'BDA_DecJan_2020.pdf' },
    { name: 'Dec 2020 / Jan 2021 Paper', year: '2021', file: 'BDA_DecJan_2021.pdf' },
    { name: 'June/July 2022 Paper', year: '2022', file: 'BDA_JunJul_2022.pdf' },
    { name: 'Dec 2022 / Jan 2023 Paper', year: '2023', file: 'BDA_DecJan_2023.pdf' },
    { name: 'June/July 2023 Paper', year: '2024', file: 'BDA_JunJul_2024.pdf' }
  ];

  const papers: any[] = [];
  for (let i = 0; i < paperSpecs.length; i++) {
    const spec = paperSpecs[i];
    // Generate valid physical PDF file on disk
    const pdfPath = await generateQuestionPaperPDF({
      fileName: spec.file,
      paperName: spec.name,
      year: spec.year,
      subjectName: 'Big Data Analytics',
      subjectCode: '18CS81',
      questions: [
        { qNum: '1', text: 'Compare traditional databases and Big Data in terms of scalability and data models.', marks: '10 Marks' },
        { qNum: '2', text: 'Explain the five V\'s of Big Data with neat diagram and appropriate examples.', marks: '10 Marks' },
        { qNum: '3', text: 'Explain Hadoop architecture and describe the primary responsibilities of NameNode and DataNode.', marks: '10 Marks' },
        { qNum: '4', text: 'Explain HDFS architecture and data block replication pipeline.', marks: '10 Marks' },
        { qNum: '5', text: 'Explain CAP theorem and its significance in modern distributed NoSQL systems.', marks: '10 Marks' }
      ]
    }, uploadsDir);

    const createdPaper = await prisma.paper.create({
      data: {
        subjectId: subject.id,
        paperName: spec.name,
        year: spec.year,
        uploadedFilePath: pdfPath,
        extractionStatus: 'EXTRACTED',
        pageCount: 1,
        rawExtractedText: `VISVESVARAYA TECHNOLOGICAL UNIVERSITY\nBig Data Analytics (18CS81)\nPaper: ${spec.name} (${spec.year})\nQ1. Compare traditional databases and Big Data. [10 Marks]\nQ2. Explain the five V's of Big Data. [10 Marks]\nQ3. Explain Hadoop architecture. [10 Marks]\nQ4. Explain HDFS. [10 Marks]\nQ5. Explain CAP theorem in NoSQL. [10 Marks]`
      }
    });
    papers.push(createdPaper);
  }

  // 4. Create Questions & Occurrences matching prompt specs exactly
  // Module 1 Questions
  const m1Questions = [
    {
      canonical: 'Compare traditional databases and Big Data.',
      // Repeated in 7 of 8 papers (p0, p1, p2, p3, p4, p5, p6)
      paperIndices: [0, 1, 2, 3, 4, 5, 6],
      variations: [
        'Compare traditional databases and Big Data.',
        'Differentiate between RDBMS and Big Data systems.',
        'Compare traditional relational databases with Big Data technologies.',
        'Compare traditional databases and Big Data with suitable examples.',
        'Contrast traditional database management with Big Data architectures.',
        'Compare and contrast traditional database systems with Big Data storage.',
        'Compare traditional databases vs Big Data processing engines.'
      ]
    },
    {
      canonical: 'Explain the five V\'s of Big Data.',
      // Repeated in 6 of 8 papers (p0, p1, p2, p3, p5, p7) -> matches example in prompt!
      paperIndices: [0, 1, 2, 3, 5, 7],
      variations: [
        'Explain the five V\'s of Big Data.',
        'Describe the characteristics of Big Data (5 V\'s).',
        'Write a note on the five dimensions of Big Data.',
        'Explain the 5 V\'s of Big Data with neat diagram.',
        'Outline the five V characteristics of Big Data.',
        'Explain five V\'s of Big Data in detail.'
      ]
    },
    {
      canonical: 'Short note on Big Data and its characteristics.',
      // Repeated in 5 of 8 papers
      paperIndices: [0, 1, 3, 4, 6],
      variations: [
        'Short note on Big Data and its characteristics.',
        'Write a short note on Big Data and key characteristics.',
        'Briefly explain Big Data and its main characteristics.',
        'Write short notes on Big Data definition and characteristics.',
        'Explain Big Data and its core characteristics.'
      ]
    },
    {
      canonical: 'Give two examples of Big Data case studies.',
      // Repeated in 3 of 8 papers
      paperIndices: [1, 3, 7],
      variations: [
        'Give two examples of Big Data case studies.',
        'Discuss any two real-world case studies in Big Data.',
        'Provide two examples of industry Big Data case studies.'
      ]
    },
    {
      canonical: 'Explain Big Data architecture and its characteristics.',
      // Repeated in 2 of 8 papers
      paperIndices: [2, 5],
      variations: [
        'Explain Big Data architecture and its characteristics.',
        'Describe the architectural layers of Big Data platforms.'
      ]
    },
    {
      canonical: 'Explain Big Data enabling technologies.',
      // Repeated in 1 of 8 papers
      paperIndices: [0],
      variations: ['Explain Big Data enabling technologies.']
    }
  ];

  for (const qDef of m1Questions) {
    const q = await prisma.question.create({
      data: {
        moduleId: modules[1].id,
        canonicalQuestionText: qDef.canonical
      }
    });
    for (let k = 0; k < qDef.paperIndices.length; k++) {
      const pIdx = qDef.paperIndices[k];
      await prisma.questionOccurrence.create({
        data: {
          questionId: q.id,
          paperId: papers[pIdx].id,
          originalQuestionText: qDef.variations[k] || qDef.canonical,
          marks: '10 Marks',
          sourcePageNumber: 1
        }
      });
    }
  }

  // Module 2 Questions
  const m2Questions = [
    {
      canonical: 'Explain Hadoop architecture.',
      // Repeated in 7 of 8 papers
      paperIndices: [0, 1, 2, 3, 4, 5, 7],
      variations: [
        'Explain Hadoop architecture.',
        'Describe the core components of Apache Hadoop architecture.',
        'With a neat diagram, explain Hadoop architecture.',
        'Discuss Hadoop core architecture and execution model.',
        'Explain Hadoop architecture and its daemon services.',
        'Describe Hadoop architecture and cluster topology.',
        'Explain Hadoop architecture in detail.'
      ]
    },
    {
      canonical: 'Explain HDFS.',
      // Repeated in 5 of 8 papers
      paperIndices: [0, 2, 3, 5, 6],
      variations: [
        'Explain HDFS.',
        'Describe Hadoop Distributed File System (HDFS) architecture.',
        'Explain HDFS architecture, block allocation, and replication.',
        'Write short note on HDFS design goals and components.',
        'Explain HDFS and its master-worker topology.'
      ]
    },
    {
      canonical: 'Explain MapReduce.',
      // Repeated in 3 of 8 papers
      paperIndices: [1, 4, 7],
      variations: [
        'Explain MapReduce.',
        'Describe the MapReduce computational framework.',
        'Explain MapReduce execution workflow with map, shuffle, and reduce phases.'
      ]
    },
    {
      canonical: 'Discuss YARN and its resource manager components.',
      // Repeated in 2 of 8 papers
      paperIndices: [2, 6],
      variations: [
        'Discuss YARN and its resource manager components.',
        'Explain Apache YARN architecture and resource scheduling.'
      ]
    }
  ];

  for (const qDef of m2Questions) {
    const q = await prisma.question.create({
      data: {
        moduleId: modules[2].id,
        canonicalQuestionText: qDef.canonical
      }
    });
    for (let k = 0; k < qDef.paperIndices.length; k++) {
      const pIdx = qDef.paperIndices[k];
      await prisma.questionOccurrence.create({
        data: {
          questionId: q.id,
          paperId: papers[pIdx].id,
          originalQuestionText: qDef.variations[k] || qDef.canonical,
          marks: '10 Marks',
          sourcePageNumber: 1
        }
      });
    }
  }

  // Module 3 Questions
  const m3Questions = [
    {
      canonical: 'Explain CAP theorem and its significance in NoSQL.',
      paperIndices: [0, 1, 2, 4, 6, 7], // 6/8
      variations: [
        'Explain CAP theorem and its significance in NoSQL.',
        'Describe CAP theorem with examples of CP, AP, and CA systems.',
        'State and explain CAP theorem in distributed databases.',
        'Write a detailed note on CAP theorem in NoSQL stores.',
        'Discuss the significance of CAP theorem in Big Data storage.',
        'Explain CAP theorem and PACELC theorem in NoSQL.'
      ]
    },
    {
      canonical: 'Differentiate between SQL and NoSQL databases.',
      paperIndices: [1, 2, 3, 5, 6], // 5/8
      variations: [
        'Differentiate between SQL and NoSQL databases.',
        'Compare relational SQL and distributed NoSQL databases.',
        'Distinguish between SQL and NoSQL systems.',
        'Tabulate the differences between SQL and NoSQL architectures.',
        'Compare SQL vs NoSQL on schema, transactions, and scaling.'
      ]
    },
    {
      canonical: 'Explain key-value and document stores with examples.',
      paperIndices: [0, 3, 4, 7], // 4/8
      variations: [
        'Explain key-value and document stores with examples.',
        'Describe key-value stores (Redis) and document databases (MongoDB).',
        'Compare Key-Value and Document data models in NoSQL.',
        'Explain document-oriented and key-value datastores.'
      ]
    }
  ];

  for (const qDef of m3Questions) {
    const q = await prisma.question.create({
      data: {
        moduleId: modules[3].id,
        canonicalQuestionText: qDef.canonical
      }
    });
    for (let k = 0; k < qDef.paperIndices.length; k++) {
      const pIdx = qDef.paperIndices[k];
      await prisma.questionOccurrence.create({
        data: {
          questionId: q.id,
          paperId: papers[pIdx].id,
          originalQuestionText: qDef.variations[k] || qDef.canonical,
          marks: '10 Marks',
          sourcePageNumber: 1
        }
      });
    }
  }

  // Module 4 Questions
  const m4Questions = [
    {
      canonical: 'Explain text analytics and sentiment analysis in Big Data.',
      paperIndices: [1, 2, 4, 5, 7], // 5/8
      variations: [
        'Explain text analytics and sentiment analysis in Big Data.',
        'Discuss text mining and sentiment analysis techniques.',
        'Explain the stages of sentiment analysis on social media text.',
        'Describe text analytics pipeline for unstructured data.',
        'Explain text processing and sentiment classification in Big Data.'
      ]
    },
    {
      canonical: 'Describe clustering algorithms used in big data analytics.',
      paperIndices: [0, 3, 6], // 3/8
      variations: [
        'Describe clustering algorithms used in big data analytics.',
        'Explain K-Means clustering algorithm for large-scale data.',
        'Discuss partitioned and hierarchical clustering in Big Data.'
      ]
    }
  ];

  for (const qDef of m4Questions) {
    const q = await prisma.question.create({
      data: {
        moduleId: modules[4].id,
        canonicalQuestionText: qDef.canonical
      }
    });
    for (let k = 0; k < qDef.paperIndices.length; k++) {
      const pIdx = qDef.paperIndices[k];
      await prisma.questionOccurrence.create({
        data: {
          questionId: q.id,
          paperId: papers[pIdx].id,
          originalQuestionText: qDef.variations[k] || qDef.canonical,
          marks: '10 Marks',
          sourcePageNumber: 1
        }
      });
    }
  }

  // Module 5 Questions
  const m5Questions = [
    {
      canonical: 'Explain the principles of effective data visualization.',
      paperIndices: [1, 3, 5, 7], // 4/8
      variations: [
        'Explain the principles of effective data visualization.',
        'Describe core visual design guidelines for Big Data reporting.',
        'Explain design principles and best practices for charts and graphs.',
        'Discuss graphical integrity and visual clarity in data visualization.'
      ]
    },
    {
      canonical: 'Discuss modern tools used for Big Data visualization.',
      paperIndices: [2, 6], // 2/8
      variations: [
        'Discuss modern tools used for Big Data visualization.',
        'Compare Tableau, PowerBI, and D3.js for large scale analytics.'
      ]
    }
  ];

  for (const qDef of m5Questions) {
    const q = await prisma.question.create({
      data: {
        moduleId: modules[5].id,
        canonicalQuestionText: qDef.canonical
      }
    });
    for (let k = 0; k < qDef.paperIndices.length; k++) {
      const pIdx = qDef.paperIndices[k];
      await prisma.questionOccurrence.create({
        data: {
          questionId: q.id,
          paperId: papers[pIdx].id,
          originalQuestionText: qDef.variations[k] || qDef.canonical,
          marks: '10 Marks',
          sourcePageNumber: 1
        }
      });
    }
  }

  console.log('Seeding completed successfully!');
  return subject;
}

// Run standalone if executed directly
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  runSeed(true)
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
