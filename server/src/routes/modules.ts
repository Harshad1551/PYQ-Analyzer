import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// Create module under a subject
router.post('/subjects/:subjectId/modules', async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { moduleName, order } = req.body;

    if (!moduleName || !moduleName.trim()) {
      return res.status(400).json({ error: 'Module name is required' });
    }

    // Determine default order if not provided
    let finalOrder = order;
    if (finalOrder === undefined) {
      const highest = await prisma.module.findFirst({
        where: { subjectId },
        orderBy: { order: 'desc' }
      });
      finalOrder = highest ? highest.order + 1 : 1;
    }

    const created = await prisma.module.create({
      data: {
        subjectId,
        moduleName: moduleName.trim(),
        order: finalOrder
      }
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create module' });
  }
});

// Update module name or order
router.put('/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { moduleName, order } = req.body;

    const updated = await prisma.module.update({
      where: { id },
      data: {
        moduleName: moduleName ? moduleName.trim() : undefined,
        order: order !== undefined ? Number(order) : undefined
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update module' });
  }
});

// Delete module
router.delete('/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.module.delete({ where: { id } });
    res.json({ message: 'Module deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete module' });
  }
});

// Reorder modules
router.put('/subjects/:subjectId/modules/reorder', async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { orders } = req.body; // array of { id: string, order: number }

    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'orders array is required' });
    }

    await prisma.$transaction(
      orders.map(item =>
        prisma.module.update({
          where: { id: item.id },
          data: { order: item.order }
        })
      )
    );

    const reordered = await prisma.module.findMany({
      where: { subjectId },
      orderBy: { order: 'asc' }
    });

    res.json(reordered);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reorder modules' });
  }
});

export default router;
