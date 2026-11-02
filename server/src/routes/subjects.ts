import { Router } from 'express';
import { prisma } from '../db.js';
import { calculateQuestionSimilarity } from '../services/similarity.js';

const router = Router();

// GET all subjects with summary stats
router.get('/', async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            papers: true,
            modules: true
          }
        },
        modules: {
          include: {
            questions: {
              include: {
                occurrences: true
              }
            }
          }
        }
      }
    });

    const formatted = subjects.map(s => {
      let totalQuestions = 0;
      let topRepeatedQuestion: { text: string; count: number; percentage: number } | null = null;
      let maxCount = -1;

      for (const m of s.modules) {
        totalQuestions += m.questions.length;
        for (const q of m.questions) {
          const distinctPapers = new Set(q.occurrences.map(o => o.paperId)).size;
          if (distinctPapers > maxCount) {
            maxCount = distinctPapers;
            const pct = s._count.papers > 0 ? Math.round((distinctPapers / s._count.papers) * 100) : 0;
            topRepeatedQuestion = {
              text: q.canonicalQuestionText,
              count: distinctPapers,
              percentage: pct
            };
          }
        }
      }

      return {
        id: s.id,
        name: s.name,
        subjectCode: s.subjectCode,
        description: s.description,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        totalPapers: s._count.papers,
        totalModules: s._count.modules,
        totalQuestions,
        topRepeatedQuestion: maxCount > 0 ? topRepeatedQuestion : null
      };
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch subjects' });
  }
});

// GET single subject with modules, papers, questions
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              include: {
                occurrences: {
                  include: {
                    paper: {
                      select: {
                        id: true,
                        paperName: true,
                        year: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        papers: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(subject);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch subject' });
  }
});

// POST create subject
router.post('/', async (req, res) => {
  try {
    const { name, subjectCode, description, initialModules } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Subject name is required' });
    }

    const subject = await prisma.subject.create({
      data: {
        name: name.trim(),
        subjectCode: subjectCode ? subjectCode.trim() : null,
        description: description ? description.trim() : null,
        modules: {
          create: (initialModules && Array.isArray(initialModules) && initialModules.length > 0)
            ? initialModules.map((m: string, idx: number) => ({
                moduleName: m.trim(),
                order: idx + 1
              }))
            : [
                { moduleName: 'Module 1', order: 1 },
                { moduleName: 'Module 2', order: 2 },
                { moduleName: 'Module 3', order: 3 },
                { moduleName: 'Module 4', order: 4 },
                { moduleName: 'Module 5', order: 5 }
              ]
        }
      },
      include: {
        modules: { orderBy: { order: 'asc' } },
        papers: true
      }
    });

    res.status(201).json(subject);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create subject' });
  }
});

// PUT update subject
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subjectCode, description } = req.body;
    const updated = await prisma.subject.update({
      where: { id },
      data: {
        name: name?.trim(),
        subjectCode: subjectCode !== undefined ? subjectCode?.trim() || null : undefined,
        description: description !== undefined ? description?.trim() || null : undefined
      }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update subject' });
  }
});

// DELETE subject
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.subject.delete({ where: { id } });
    res.json({ message: 'Subject deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete subject' });
  }
});

// GET Frequency Report
// The core report meeting Section 4:
// Subject -> Modules -> Questions -> Repetition count (e.g. 6/8, 75%)
// Sorted descending by repetition count
router.get('/:id/report', async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        papers: {
          select: {
            id: true,
            paperName: true,
            year: true
          },
          orderBy: { year: 'asc' }
        },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              include: {
                occurrences: {
                  include: {
                    paper: {
                      select: {
                        id: true,
                        paperName: true,
                        year: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const totalAvailablePapers = subject.papers.length;

    let overallQuestionCount = 0;
    let highFrequencyCount = 0; // >= 50%
    let singleAppearanceCount = 0; // == 1

    const reportModules = subject.modules.map(module => {
      const questionsWithStats = module.questions.map(q => {
        // Distinct papers this question appeared in
        const paperIdsSet = new Set(q.occurrences.map(o => o.paperId));
        const repetitionCount = paperIdsSet.size;
        const repetitionPercentage = totalAvailablePapers > 0
          ? Math.round((repetitionCount / totalAvailablePapers) * 100)
          : 0;

        if (repetitionPercentage >= 50) highFrequencyCount++;
        if (repetitionCount === 1) singleAppearanceCount++;
        const distinctMarks = Array.from(new Set(q.occurrences.map(o => o.marks).filter(Boolean))) as string[];
        const marks = distinctMarks.length > 0 ? distinctMarks.join(' / ') : null;

        return {
          id: q.id,
          canonicalQuestionText: q.canonicalQuestionText,
          isManual: q.isManual,
          marks,
          repetitionCount,
          totalAvailablePapers,
          repetitionFraction: `${repetitionCount}/${totalAvailablePapers}`,
          repetitionPercentage,
          occurrences: q.occurrences.map(o => ({
            id: o.id,
            paperId: o.paperId,
            paperName: o.paper.paperName,
            paperYear: o.paper.year,
            originalQuestionText: o.originalQuestionText,
            sourcePageNumber: o.sourcePageNumber,
            marks: o.marks
          }))
        };
      });

      // Sort questions strictly descending by repetition count, then canonical text
      questionsWithStats.sort((a, b) => {
        if (b.repetitionCount !== a.repetitionCount) {
          return b.repetitionCount - a.repetitionCount;
        }
        return a.canonicalQuestionText.localeCompare(b.canonicalQuestionText);
      });

      return {
        id: module.id,
        moduleName: module.moduleName,
        order: module.order,
        questionCount: questionsWithStats.length,
        questions: questionsWithStats
      };
    });

    res.json({
      subject: {
        id: subject.id,
        name: subject.name,
        subjectCode: subject.subjectCode,
        description: subject.description
      },
      totalAvailablePapers,
      papers: subject.papers,
      summary: {
        totalModules: reportModules.length,
        totalQuestions: overallQuestionCount,
        highFrequencyQuestions: highFrequencyCount,
        singleAppearanceQuestions: singleAppearanceCount
      },
      modules: reportModules
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
});

// GET Similarity Suggestions for questions in this subject
router.get('/:id/similarity-suggestions', async (req, res) => {
  try {
    const { id } = req.params;
    const questions = await prisma.question.findMany({
      where: {
        module: {
          subjectId: id
        }
      },
      include: {
        module: { select: { id: true, moduleName: true } },
        occurrences: {
          include: {
            paper: { select: { id: true, paperName: true } }
          }
        }
      }
    });

    const suggestions: Array<{
      questionA: { id: string; text: string; moduleId: string; moduleName: string; occurrencesCount: number; papers: string[] };
      questionB: { id: string; text: string; moduleId: string; moduleName: string; occurrencesCount: number; papers: string[] };
      similarity: number;
      isHighConfidence: boolean;
      commonTerms: string[];
      explanation: string;
    }> = [];

    // Pairwise comparison
    for (let i = 0; i < questions.length; i++) {
      for (let j = i + 1; j < questions.length; j++) {
        const qA = questions[i];
        const qB = questions[j];

        // Check if they share any papers (if they already appeared in the same paper, merging would combine them into 1 per paper)
        const sim = calculateQuestionSimilarity(qA.canonicalQuestionText, qB.canonicalQuestionText);
        if (sim.isMatchCandidate) {
          suggestions.push({
            questionA: {
              id: qA.id,
              text: qA.canonicalQuestionText,
              moduleId: qA.module.id,
              moduleName: qA.module.moduleName,
              occurrencesCount: qA.occurrences.length,
              papers: qA.occurrences.map(o => o.paper.paperName)
            },
            questionB: {
              id: qB.id,
              text: qB.canonicalQuestionText,
              moduleId: qB.module.id,
              moduleName: qB.module.moduleName,
              occurrencesCount: qB.occurrences.length,
              papers: qB.occurrences.map(o => o.paper.paperName)
            },
            similarity: sim.score,
            isHighConfidence: sim.isHighConfidence,
            commonTerms: sim.commonTerms,
            explanation: sim.explanation
          });
        }
      }
    }

    // Sort by highest similarity first
    suggestions.sort((a, b) => b.similarity - a.similarity);

    res.json(suggestions);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate suggestions' });
  }
});

export default router;
