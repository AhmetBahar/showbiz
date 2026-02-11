import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middleware/auth';

const router = Router();

// Satış özet raporu
router.get('/shows/:showId/summary', authenticate, async (req, res) => {
  try {
    const showId = parseInt(req.params.showId);

    const show = await prisma.show.findUnique({
      where: { id: showId },
      include: { venue: true, categories: true },
    });

    if (!show) {
      return res.status(404).json({ error: 'Gösteri bulunamadı' });
    }

    const tickets = await prisma.ticket.findMany({
      where: { showId },
      include: { category: true },
    });

    const total = tickets.length;
    const available = tickets.filter((t) => t.status === 'available').length;
    const reserved = tickets.filter((t) => t.status === 'reserved').length;
    const sold = tickets.filter((t) => t.status === 'sold').length;
    const cancelled = tickets.filter((t) => t.status === 'cancelled').length;
    const checkedIn = tickets.filter((t) => t.checkedInAt).length;

    const revenue = tickets
      .filter((t) => t.status === 'sold')
      .reduce((sum, t) => sum + (t.category?.price || 0), 0);

    // Kategori bazlı dağılım
    const byCategory = show.categories.map((cat) => {
      const catTickets = tickets.filter((t) => t.categoryId === cat.id);
      return {
        category: cat.name,
        color: cat.color,
        price: cat.price,
        total: catTickets.length,
        available: catTickets.filter((t) => t.status === 'available').length,
        reserved: catTickets.filter((t) => t.status === 'reserved').length,
        sold: catTickets.filter((t) => t.status === 'sold').length,
        cancelled: catTickets.filter((t) => t.status === 'cancelled').length,
        revenue: catTickets
          .filter((t) => t.status === 'sold')
          .reduce((sum, t) => sum + cat.price, 0),
      };
    });

    return res.json({
      show: { id: show.id, name: show.name, date: show.date, status: show.status },
      venue: show.venue.name,
      summary: { total, available, reserved, sold, cancelled, checkedIn, revenue },
      byCategory,
      occupancyRate: total > 0 ? ((sold + reserved) / total) * 100 : 0,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Seyirci listesi
router.get('/shows/:showId/audience', authenticate, async (req, res) => {
  try {
    const showId = parseInt(req.params.showId);

    const tickets = await prisma.ticket.findMany({
      where: {
        showId,
        status: { in: ['reserved', 'sold'] },
      },
      include: {
        seat: { include: { section: { include: { floor: true } } } },
        category: true,
        reservedBy: { select: { name: true } },
        soldBy: { select: { name: true } },
      },
      orderBy: [
        { seat: { section: { floor: { level: 'asc' } } } },
        { seat: { row: 'asc' } },
        { seat: { number: 'asc' } },
      ],
    });

    const audience = tickets.map((t) => ({
      ticketId: t.id,
      holderName: t.holderName,
      holderPhone: t.holderPhone,
      holderEmail: t.holderEmail,
      status: t.status,
      barcode: t.barcode,
      floor: t.seat.section.floor.name,
      section: t.seat.section.name,
      row: t.seat.row,
      seatNumber: t.seat.number,
      category: t.category.name,
      price: t.category.price,
      reservedBy: t.reservedBy?.name,
      soldBy: t.soldBy?.name,
      reservedAt: t.reservedAt,
      soldAt: t.soldAt,
      checkedIn: !!t.checkedInAt,
      checkedInAt: t.checkedInAt,
    }));

    return res.json(audience);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Gerçekleşen seyirci raporu (check-in yapanlar)
router.get('/shows/:showId/attendance', authenticate, async (req, res) => {
  try {
    const showId = parseInt(req.params.showId);

    const tickets = await prisma.ticket.findMany({
      where: { showId, status: 'sold' },
      include: {
        seat: { include: { section: { include: { floor: true } } } },
        category: true,
      },
    });

    const totalSold = tickets.length;
    const checkedIn = tickets.filter((t) => t.checkedInAt);
    const notCheckedIn = tickets.filter((t) => !t.checkedInAt);

    return res.json({
      totalSold,
      checkedInCount: checkedIn.length,
      notCheckedInCount: notCheckedIn.length,
      attendanceRate: totalSold > 0 ? (checkedIn.length / totalSold) * 100 : 0,
      checkedIn: checkedIn.map((t) => ({
        holderName: t.holderName,
        floor: t.seat.section.floor.name,
        section: t.seat.section.name,
        row: t.seat.row,
        seatNumber: t.seat.number,
        category: t.category.name,
        checkedInAt: t.checkedInAt,
      })),
      notCheckedIn: notCheckedIn.map((t) => ({
        holderName: t.holderName,
        holderPhone: t.holderPhone,
        floor: t.seat.section.floor.name,
        section: t.seat.section.name,
        row: t.seat.row,
        seatNumber: t.seat.number,
        category: t.category.name,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;
