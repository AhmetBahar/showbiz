import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_req, res) => {
  try {
    const shows = await prisma.show.findMany({
      include: {
        venue: { select: { id: true, name: true } },
        categories: true,
        _count: { select: { tickets: true } },
      },
      orderBy: { date: 'desc' },
    });
    return res.json(shows);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const show = await prisma.show.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        venue: {
          include: {
            floors: {
              orderBy: { level: 'asc' },
              include: {
                sections: {
                  include: {
                    seats: { orderBy: [{ row: 'asc' }, { number: 'asc' }] },
                  },
                },
              },
            },
          },
        },
        categories: true,
      },
    });

    if (!show) {
      return res.status(404).json({ error: 'Gösteri bulunamadı' });
    }

    return res.json(show);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { venueId, name, description, date } = req.body;
    const show = await prisma.show.create({
      data: { venueId, name, description, date: new Date(date) },
      include: { venue: { select: { id: true, name: true } }, categories: true },
    });
    return res.status(201).json(show);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, date, status } = req.body;
    const show = await prisma.show.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(date && { date: new Date(date) }),
        ...(status && { status }),
      },
      include: { venue: { select: { id: true, name: true } }, categories: true },
    });
    return res.json(show);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.show.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ message: 'Gösteri silindi' });
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Bilet kategorisi ekle
router.post('/:id/categories', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, price, color, description } = req.body;
    const category = await prisma.ticketCategory.create({
      data: {
        showId: parseInt(req.params.id),
        name,
        price,
        color,
        description,
      },
    });
    return res.status(201).json(category);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/:id/categories/:catId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, price, color, description } = req.body;
    const category = await prisma.ticketCategory.update({
      where: { id: parseInt(req.params.catId) },
      data: { name, price, color, description },
    });
    return res.json(category);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/:id/categories/:catId', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.ticketCategory.delete({ where: { id: parseInt(req.params.catId) } });
    return res.json({ message: 'Kategori silindi' });
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Gösteri için bilet kayıtlarını oluştur (tüm koltuklar için)
router.post('/:id/initialize-tickets', authenticate, requireAdmin, async (req, res) => {
  try {
    const showId = parseInt(req.params.id);
    const { seatCategories } = req.body; // { seatId: categoryId } mapping

    const show = await prisma.show.findUnique({
      where: { id: showId },
      include: {
        venue: {
          include: {
            floors: {
              include: {
                sections: {
                  include: { seats: { where: { isActive: true } } },
                },
              },
            },
          },
        },
        categories: true,
      },
    });

    if (!show) {
      return res.status(404).json({ error: 'Gösteri bulunamadı' });
    }

    const defaultCategoryId = show.categories[0]?.id;
    if (!defaultCategoryId) {
      return res.status(400).json({ error: 'Önce en az bir bilet kategorisi oluşturun' });
    }

    // Mevcut biletleri kontrol et
    const existingTickets = await prisma.ticket.findMany({
      where: { showId },
      select: { seatId: true },
    });
    const existingSeatIds = new Set(existingTickets.map((t) => t.seatId));

    const allSeats = show.venue.floors.flatMap((f) =>
      f.sections.flatMap((s) => s.seats)
    );

    const newTickets = allSeats
      .filter((seat) => !existingSeatIds.has(seat.id))
      .map((seat) => ({
        showId,
        seatId: seat.id,
        categoryId: seatCategories?.[seat.id] || defaultCategoryId,
        status: 'available',
      }));

    if (newTickets.length === 0) {
      return res.json({ message: 'Tüm biletler zaten oluşturulmuş', count: 0 });
    }

    await prisma.ticket.createMany({ data: newTickets });

    return res.status(201).json({
      message: `${newTickets.length} bilet oluşturuldu`,
      count: newTickets.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;
