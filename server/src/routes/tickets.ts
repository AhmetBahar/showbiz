import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

function generateBarcode(): string {
  return 'SB-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

// Gösteri biletlerini getir (koltuk haritası için)
router.get('/show/:showId', authenticate, async (req, res) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { showId: parseInt(req.params.showId) },
      include: {
        seat: {
          include: {
            section: {
              include: {
                floor: true,
              },
            },
          },
        },
        category: true,
        reservedBy: { select: { id: true, name: true } },
        soldBy: { select: { id: true, name: true } },
      },
      orderBy: [
        { seat: { section: { floor: { level: 'asc' } } } },
        { seat: { row: 'asc' } },
        { seat: { number: 'asc' } },
      ],
    });
    return res.json(tickets);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Rezervasyon yap
router.put('/:id/reserve', authenticate, async (req: AuthRequest, res) => {
  try {
    const { holderName, holderPhone, holderEmail } = req.body;
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Bilet bulunamadı' });
    }
    if (ticket.status !== 'available') {
      return res.status(400).json({ error: 'Bu koltuk müsait değil' });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'reserved',
        holderName,
        holderPhone,
        holderEmail,
        reservedById: req.user!.id,
        reservedAt: new Date(),
      },
      include: { seat: true, category: true },
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Satış yap
router.put('/:id/sell', authenticate, async (req: AuthRequest, res) => {
  try {
    const { holderName, holderPhone, holderEmail } = req.body;
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Bilet bulunamadı' });
    }
    if (ticket.status !== 'available' && ticket.status !== 'reserved') {
      return res.status(400).json({ error: 'Bu bilet satılamaz' });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'sold',
        holderName: holderName || ticket.holderName,
        holderPhone: holderPhone || ticket.holderPhone,
        holderEmail: holderEmail || ticket.holderEmail,
        barcode: ticket.barcode || generateBarcode(),
        soldById: req.user!.id,
        soldAt: new Date(),
      },
      include: { seat: true, category: true },
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Rezervasyon çöz
router.put('/:id/release', authenticate, async (req: AuthRequest, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Bilet bulunamadı' });
    }
    if (ticket.status !== 'reserved') {
      return res.status(400).json({ error: 'Bu bilet rezerve değil' });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'available',
        holderName: null,
        holderPhone: null,
        holderEmail: null,
        reservedById: null,
        reservedAt: null,
      },
      include: { seat: true, category: true },
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Bilet iptal
router.put('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Bilet bulunamadı' });
    }
    if (ticket.status === 'available' || ticket.status === 'cancelled') {
      return res.status(400).json({ error: 'Bu bilet iptal edilemez' });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'cancelled',
      },
      include: { seat: true, category: true },
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Bilet durumunu sıfırla (available yap)
router.put('/:id/reset', authenticate, async (req: AuthRequest, res) => {
  try {
    const updated = await prisma.ticket.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: 'available',
        holderName: null,
        holderPhone: null,
        holderEmail: null,
        barcode: null,
        reservedById: null,
        soldById: null,
        reservedAt: null,
        soldAt: null,
        checkedInAt: null,
      },
      include: { seat: true, category: true },
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Toplu rezervasyon
router.put('/bulk-reserve', authenticate, async (req: AuthRequest, res) => {
  try {
    const { ticketIds, holderName, holderPhone, holderEmail } = req.body;

    const tickets = await prisma.ticket.findMany({
      where: { id: { in: ticketIds }, status: 'available' },
    });

    if (tickets.length !== ticketIds.length) {
      return res.status(400).json({ error: 'Bazı koltuklar müsait değil' });
    }

    await prisma.ticket.updateMany({
      where: { id: { in: ticketIds } },
      data: {
        status: 'reserved',
        holderName,
        holderPhone,
        holderEmail,
        reservedById: req.user!.id,
        reservedAt: new Date(),
      },
    });

    return res.json({ message: `${ticketIds.length} bilet rezerve edildi` });
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Toplu satış
router.put('/bulk-sell', authenticate, async (req: AuthRequest, res) => {
  try {
    const { ticketIds, holderName, holderPhone, holderEmail } = req.body;

    const tickets = await prisma.ticket.findMany({
      where: { id: { in: ticketIds }, status: { in: ['available', 'reserved'] } },
    });

    if (tickets.length !== ticketIds.length) {
      return res.status(400).json({ error: 'Bazı biletler satılamaz' });
    }

    // Her bilet için ayrı barkod üretilmesi gerekiyor
    for (const ticket of tickets) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'sold',
          holderName: holderName || ticket.holderName,
          holderPhone: holderPhone || ticket.holderPhone,
          holderEmail: holderEmail || ticket.holderEmail,
          barcode: ticket.barcode || generateBarcode(),
          soldById: req.user!.id,
          soldAt: new Date(),
        },
      });
    }

    return res.json({ message: `${ticketIds.length} bilet satıldı` });
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Barkod ile check-in
router.post('/checkin', authenticate, async (req, res) => {
  try {
    const { barcode } = req.body;

    const ticket = await prisma.ticket.findUnique({
      where: { barcode },
      include: {
        seat: { include: { section: { include: { floor: true } } } },
        show: true,
        category: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Geçersiz barkod' });
    }

    if (ticket.status !== 'sold') {
      return res.status(400).json({ error: 'Bu bilet satılmamış', ticket });
    }

    if (ticket.checkedInAt) {
      return res.status(400).json({
        error: 'Bu bilet zaten giriş yapmış',
        checkedInAt: ticket.checkedInAt,
        ticket,
      });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { checkedInAt: new Date() },
      include: {
        seat: { include: { section: { include: { floor: true } } } },
        show: true,
        category: true,
      },
    });

    return res.json({
      message: 'Giriş başarılı',
      ticket: updated,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Bilet kategorisini değiştir
router.put('/:id/category', authenticate, async (req, res) => {
  try {
    const { categoryId } = req.body;
    const updated = await prisma.ticket.update({
      where: { id: parseInt(req.params.id) },
      data: { categoryId },
      include: { seat: true, category: true },
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;
