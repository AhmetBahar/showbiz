import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';
const bwipjs = require('bwip-js');

const router = Router();

function generateBarcode(): string {
  return 'SB-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

// Gösteri biletlerini getir (koltuk haritası için)
router.get('/show/:showId', authenticate, async (req, res) => {
  try {
    const showId = Number.parseInt(req.params.showId, 10);
    if (!Number.isInteger(showId)) {
      return res.status(400).json({ error: 'Geçersiz gösteri ID' });
    }

    const tickets = await prisma.ticket.findMany({
      where: { showId },
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
    });

    tickets.sort((a, b) => {
      const levelCmp = a.seat.section.floor.level - b.seat.section.floor.level;
      if (levelCmp !== 0) return levelCmp;

      const sectionCmp = a.seat.section.name.localeCompare(b.seat.section.name, 'tr');
      if (sectionCmp !== 0) return sectionCmp;

      const rowCmp = a.seat.row.localeCompare(b.seat.row, 'tr');
      if (rowCmp !== 0) return rowCmp;

      return a.seat.number - b.seat.number;
    });

    return res.json(tickets);
  } catch (error) {
    console.error('GET /api/tickets/show/:showId failed', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/:id/barcode', authenticate, async (req, res) => {
  try {
    const ticketId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(ticketId)) {
      return res.status(400).json({ error: 'Geçersiz bilet ID' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, status: true, barcode: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Bilet bulunamadı' });
    }
    if (ticket.status !== 'sold') {
      return res.status(400).json({ error: 'Barkod yalnızca satılmış biletler için üretilebilir' });
    }

    const barcodeValue = ticket.barcode || generateBarcode();
    if (!ticket.barcode) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { barcode: barcodeValue },
      });
    }

    const pngBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: barcodeValue,
      scale: 3,
      height: 12,
      includetext: false,
      paddingwidth: 10,
      paddingheight: 8,
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(pngBuffer);
  } catch (error) {
    console.error('GET /api/tickets/:id/barcode failed', error);
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
