import { Router } from 'express';
import { prisma } from '../db.js';
import { calculateQuestionSimilarity } from '../services/similarity.js';

const router = Router();

// POST manual question entry (Method B)
router.post('/', async (req, res) => {
  try {
    const { canonicalQuestionText, moduleId, paperIds, marks } = req.body;

    if (!canonicalQuestionText || !canonicalQuestionText.trim()) {
      return res.status(400).json({ error: 'Question text is required' });
    }
    if (!moduleId) {
      return res.status(400).json({ error: 'Module selection is required' });
    }

    const cleanedText = canonicalQuestionText.trim();
    const distinctPaperIds = Array.isArray(paperIds) ? Array.from(new Set(paperIds)) : [];

    const question = await prisma.question.create({
      data: {
        moduleId,
        canonicalQuestionText: cleanedText,
        isManual: true,
        occurrences: {
          create: distinctPaperIds.map((pId: string) => ({
            paperId: pId,
            originalQuestionText: cleanedText,
            marks: marks ? String(marks).trim() : null
          }))
        }
      },
      include: {
        module: true,
        occurrences: {
          include: {
            paper: true
          }
        }
      }
    });

    res.status(201).json(question);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create question' });
  }
});

// POST batch questions from PDF extraction (Method A)
router.post('/batch-from-extraction', async (req, res) => {
  try {
    const { paperId, items } = req.body;
    // items: Array<{
    //   canonicalQuestionText: string;
    //   originalQuestionText: string;
    //   moduleId: string;
    //   existingQuestionId?: string; // if user approved matching with existing question
    //   marks?: string;
    //   pageNumber?: number;
    // }>

    if (!paperId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'paperId and items array are required' });
    }

    const processed = [];

    for (const item of items) {
      const originalText = (item.originalQuestionText || item.canonicalQuestionText || '').trim();
      const canonicalText = (item.canonicalQuestionText || item.originalQuestionText || '').trim();
      const moduleId = item.moduleId;
      const marks = item.marks ? String(item.marks).trim() : null;
      const pageNumber = item.pageNumber ? Number(item.pageNumber) : null;

      if (!originalText || !moduleId) continue;

      if (item.existingQuestionId) {
        // Link to existing question
        // Check if an occurrence already exists for this (questionId, paperId)
        const existingOcc = await prisma.questionOccurrence.findUnique({
          where: {
            questionId_paperId: {
              questionId: item.existingQuestionId,
              paperId
            }
          }
        });

        if (!existingOcc) {
          const occ = await prisma.questionOccurrence.create({
            data: {
              questionId: item.existingQuestionId,
              paperId,
              originalQuestionText: originalText,
              marks,
              sourcePageNumber: pageNumber
            }
          });
          processed.push({ type: 'linked', questionId: item.existingQuestionId, occurrenceId: occ.id });
        } else {
          processed.push({ type: 'already_linked', questionId: item.existingQuestionId });
        }
      } else {
        // Create new question + occurrence
        const newQ = await prisma.question.create({
          data: {
            moduleId,
            canonicalQuestionText: canonicalText,
            occurrences: {
              create: {
                paperId,
                originalQuestionText: originalText,
                marks,
                sourcePageNumber: pageNumber
              }
            }
          }
        });
        processed.push({ type: 'created', questionId: newQ.id });
      }
    }

    res.status(201).json({ message: 'Questions saved successfully', count: processed.length, processed });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save extracted questions' });
  }
});

// Check similarity of candidate text against existing questions
router.post('/similarity-check', async (req, res) => {
  try {
    const { text, subjectId, moduleId } = req.body;
    if (!text || !subjectId) {
      return res.status(400).json({ error: 'text and subjectId are required' });
    }

    const whereClause: any = {
      module: {
        subjectId
      }
    };
    if (moduleId) {
      whereClause.moduleId = moduleId;
    }

    const existingQuestions = await prisma.question.findMany({
      where: whereClause,
      include: {
        module: { select: { id: true, moduleName: true } },
        occurrences: {
          include: {
            paper: { select: { id: true, paperName: true } }
          }
        }
      }
    });

    const matches = existingQuestions.map(q => {
      const sim = calculateQuestionSimilarity(text, q.canonicalQuestionText);
      return {
        questionId: q.id,
        canonicalQuestionText: q.canonicalQuestionText,
        moduleId: q.module.id,
        moduleName: q.module.moduleName,
        occurrencesCount: q.occurrences.length,
        papers: q.occurrences.map(o => o.paper.paperName),
        similarity: sim.score,
        isMatchCandidate: sim.isMatchCandidate,
        isHighConfidence: sim.isHighConfidence,
        commonTerms: sim.commonTerms,
        explanation: sim.explanation
      };
    });

    matches.sort((a, b) => b.similarity - a.similarity);

    // Return matches with similarity >= 40% (or top 5)
    const candidates = matches.filter(m => m.similarity >= 40).slice(0, 5);

    res.json({
      bestMatch: candidates.length > 0 ? candidates[0] : null,
      candidates
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to run similarity check' });
  }
});

// Merge questions: merge sourceQuestion into targetQuestion
router.post('/merge', async (req, res) => {
  try {
    const { targetQuestionId, sourceQuestionId } = req.body;

    if (!targetQuestionId || !sourceQuestionId) {
      return res.status(400).json({ error: 'targetQuestionId and sourceQuestionId are required' });
    }
    if (targetQuestionId === sourceQuestionId) {
      return res.status(400).json({ error: 'Cannot merge a question into itself' });
    }

    const target = await prisma.question.findUnique({
      where: { id: targetQuestionId },
      include: { occurrences: true }
    });
    const source = await prisma.question.findUnique({
      where: { id: sourceQuestionId },
      include: { occurrences: true }
    });

    if (!target || !source) {
      return res.status(404).json({ error: 'One or both questions not found' });
    }

    const targetPaperIds = new Set(target.occurrences.map(o => o.paperId));

    // Move occurrences from source to target
    for (const occ of source.occurrences) {
      if (targetPaperIds.has(occ.paperId)) {
        // Paper already represented in target; remove redundant occurrence
        await prisma.questionOccurrence.delete({ where: { id: occ.id } });
      } else {
        // Re-link occurrence to target
        await prisma.questionOccurrence.update({
          where: { id: occ.id },
          data: { questionId: targetQuestionId }
        });
        targetPaperIds.add(occ.paperId);
      }
    }

    // Delete source question
    await prisma.question.delete({ where: { id: sourceQuestionId } });

    res.json({
      message: 'Questions merged successfully',
      targetQuestionId,
      distinctPapersCount: targetPaperIds.size
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to merge questions' });
  }
});

// Unmerge an occurrence into its own separate question
router.post('/unmerge', async (req, res) => {
  try {
    const { occurrenceId, newModuleId } = req.body;

    if (!occurrenceId) {
      return res.status(400).json({ error: 'occurrenceId is required' });
    }

    const occurrence = await prisma.questionOccurrence.findUnique({
      where: { id: occurrenceId },
      include: {
        question: true
      }
    });

    if (!occurrence) {
      return res.status(404).json({ error: 'Question occurrence not found' });
    }

    const targetModuleId = newModuleId || occurrence.question.moduleId;

    // Create a new separate Question with this occurrence's original text
    const newQuestion = await prisma.question.create({
      data: {
        moduleId: targetModuleId,
        canonicalQuestionText: occurrence.originalQuestionText
      }
    });

    // Reassign occurrence to new question
    const updatedOccurrence = await prisma.questionOccurrence.update({
      where: { id: occurrenceId },
      data: { questionId: newQuestion.id }
    });

    // Check if the original question has any occurrences left
    const remainingCount = await prisma.questionOccurrence.count({
      where: { questionId: occurrence.questionId }
    });

    if (remainingCount === 0) {
      await prisma.question.delete({ where: { id: occurrence.questionId } });
    }

    res.json({
      message: 'Question unmerged successfully',
      newQuestion,
      occurrence: updatedOccurrence
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to unmerge question' });
  }
});

// Update question canonical text or module
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { canonicalQuestionText, moduleId } = req.body;

    const updated = await prisma.question.update({
      where: { id },
      data: {
        canonicalQuestionText: canonicalQuestionText ? canonicalQuestionText.trim() : undefined,
        moduleId: moduleId || undefined
      },
      include: {
        module: true,
        occurrences: {
          include: { paper: true }
        }
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update question' });
  }
});

// Delete question
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.question.delete({ where: { id } });
    res.json({ message: 'Question deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete question' });
  }
});

export default router;
