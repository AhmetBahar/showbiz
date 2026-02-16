import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const router = Router();

function isValidHexColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
}

router.get('/', authenticate, async (_req, res) => {
  try {
    const shows = await prisma.show.findMany({
      include: {
        categories: true,
        _count: { select: { tickets: true } },
      },
      orderBy: { date: 'desc' },
    });
    const venueIds = [...new Set(shows.map((s) => s.venueId))];
    const venues = await prisma.venue.findMany({
      where: { id: { in: venueIds } },
      select: { id: true, name: true },
    });
    const venueById = new Map(venues.map((v) => [v.id, v]));

    const normalizedShows = shows.map((s) => ({
      ...s,
      venue: venueById.get(s.venueId) || { id: s.venueId, name: 'Salon Bulunamadı' },
    }));

    return res.json(normalizedShows);
  } catch (error) {
    console.error('GET /api/shows failed', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const showId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(showId)) {
      return res.status(400).json({ error: 'Geçersiz gösteri ID' });
    }

    const show = await prisma.show.findUnique({
      where: { id: showId },
      include: {
        categories: true,
      },
    });

    if (!show) {
      return res.status(404).json({ error: 'Gösteri bulunamadı' });
    }

    let venue = await prisma.venue.findUnique({
      where: { id: show.venueId },
      include: {
        floors: {
          include: {
            sections: {
              include: {
                seats: true,
              },
            },
          },
        },
      },
    });

    if (!venue) {
      return res.status(409).json({ error: 'Gösteriye bağlı salon kaydı bulunamadı' });
    }

    venue.floors.sort((a, b) => a.level - b.level);
    for (const floor of venue.floors) {
      floor.sections.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      for (const section of floor.sections) {
        section.seats.sort((a, b) => {
          const rowCmp = a.row.localeCompare(b.row, 'tr');
          if (rowCmp !== 0) return rowCmp;
          return a.number - b.number;
        });
      }
    }

    return res.json({ ...show, venue });
  } catch (error) {
    console.error('GET /api/shows/:id failed', error);
    try {
      const showId = Number.parseInt(req.params.id, 10);
      const show = await prisma.show.findUnique({
        where: { id: showId },
        include: { categories: true },
      });

      if (!show) {
        return res.status(404).json({ error: 'Gösteri bulunamadı' });
      }

      const venue = await prisma.venue.findUnique({
        where: { id: show.venueId },
        select: { id: true, name: true },
      });

      return res.json({
        ...show,
        venue: venue || { id: show.venueId, name: 'Salon Bulunamadı' },
        _warning: 'SHOW_DETAIL_FALLBACK',
      });
    } catch (fallbackError: any) {
      console.error('GET /api/shows/:id fallback failed', fallbackError);
      const originalError = error as any;
      return res.status(500).json({
        error: 'Sunucu hatası',
        code: fallbackError?.code || originalError?.code || 'SHOW_DETAIL_UNKNOWN',
      });
    }
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { venueId, name, description, date } = req.body;

    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      return res.status(400).json({ error: 'Seçilen salon bulunamadı' });
    }

    const show = await prisma.show.create({
      data: { venueId, name, description, date: new Date(date) },
      include: { venue: { select: { id: true, name: true } }, categories: true },
    });
    return res.status(201).json(show);
  } catch (error) {
    console.error('POST /api/shows failed', error);
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
    console.error('PUT /api/shows/:id failed', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const showId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(showId)) {
      return res.status(400).json({ error: 'Geçersiz gösteri ID' });
    }

    const existing = await prisma.show.findUnique({
      where: { id: showId },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Gösteri bulunamadı' });
    }

    // LibSQL/Turso tarafında interactive transaction sorunlarını önlemek için
    // silmeleri adım adım yapıyoruz.
    await prisma.ticket.deleteMany({ where: { showId } });
    await prisma.ticketCategory.deleteMany({ where: { showId } });
    await prisma.show.delete({ where: { id: showId } });

    return res.json({ message: 'Gösteri silindi' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return res.status(409).json({ error: 'Gösteri silinemedi: ilişkili kayıtlar mevcut' });
    }
    console.error('DELETE /api/shows/:id failed', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Bilet kategorisi ekle
router.post('/:id/categories', authenticate, requireAdmin, async (req, res) => {
  try {
    const showId = parseInt(req.params.id, 10);
    if (!Number.isInteger(showId)) {
      return res.status(400).json({ error: 'Geçersiz gösteri ID' });
    }

    const show = await prisma.show.findUnique({ where: { id: showId }, select: { id: true } });
    if (!show) {
      return res.status(404).json({ error: 'Gösteri bulunamadı' });
    }

    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const parsedPrice = Number(req.body.price);
    const color = typeof req.body.color === 'string' ? req.body.color.trim() : undefined;
    const textColor = typeof req.body.textColor === 'string' ? req.body.textColor.trim() : undefined;
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : undefined;

    if (!name) {
      return res.status(400).json({ error: 'Kategori adı zorunlu' });
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Kategori fiyatı 0 veya daha büyük bir sayı olmalı' });
    }
    if (color && !isValidHexColor(color)) {
      return res.status(400).json({ error: 'Geçersiz renk formatı' });
    }
    if (textColor && !isValidHexColor(textColor)) {
      return res.status(400).json({ error: 'Geçersiz metin rengi formatı' });
    }

    const category = await prisma.ticketCategory.create({
      data: {
        showId,
        name,
        price: parsedPrice,
        color: color || null,
        textColor: textColor || null,
        description: description || null,
      },
    });
    return res.status(201).json(category);
  } catch (error) {
    console.error('POST /api/shows/:id/categories failed', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/:id/categories/:catId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, price, color, textColor, description } = req.body;
    const category = await prisma.ticketCategory.update({
      where: { id: parseInt(req.params.catId) },
      data: { name, price, color, textColor, description },
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
