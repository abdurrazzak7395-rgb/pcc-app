import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/authMiddleware.js';

const router = Router();

router.get('/me', requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  res.json({ user });
});

export const meRouter = router;
