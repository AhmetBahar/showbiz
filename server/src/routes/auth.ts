import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'showbiz-secret-key';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/register', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { email, password, name, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Bu e-posta zaten kayıtlı' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role: role || 'agent' },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/users', authenticate, requireAdmin, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/users/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Kendinizi silemezsiniz' });
    }
    await prisma.user.delete({ where: { id } });
    return res.json({ message: 'Kullanıcı silindi' });
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;
