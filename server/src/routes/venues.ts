import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_req, res) => {
  try {
    const venues = await prisma.venue.findMany({
      include: {
        floors: {
          include: {
            sections: {
              include: { seats: { select: { id: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = venues.map((v) => ({
      ...v,
      totalSeats: v.floors.reduce(
        (sum, f) => sum + f.sections.reduce((s, sec) => s + sec.seats.length, 0),
        0
      ),
    }));

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const venue = await prisma.venue.findUnique({
      where: { id: parseInt(req.params.id) },
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
    });

    if (!venue) {
      return res.status(404).json({ error: 'Salon bulunamadı' });
    }

    return res.json(venue);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, address, description, floors } = req.body;

    const venue = await prisma.venue.create({
      data: {
        name,
        address,
        description,
        floors: floors
          ? {
              create: floors.map((floor: any) => ({
                name: floor.name,
                level: floor.level,
                sections: floor.sections
                  ? {
                      create: floor.sections.map((section: any) => ({
                        name: section.name,
                        type: section.type,
                        seats: section.seats
                          ? {
                              create: section.seats.map((seat: any) => ({
                                row: seat.row,
                                number: seat.number,
                                isActive: seat.isActive ?? true,
                              })),
                            }
                          : undefined,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        floors: {
          include: {
            sections: {
              include: { seats: true },
            },
          },
        },
      },
    });

    return res.status(201).json(venue);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, address, description } = req.body;
    const venue = await prisma.venue.update({
      where: { id: parseInt(req.params.id) },
      data: { name, address, description },
    });
    return res.json(venue);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const venueId = parseInt(req.params.id);
    const log: string[] = [];

    // Read IDs with Prisma ORM
    const floors = await prisma.floor.findMany({ where: { venueId }, select: { id: true } });
    const floorIds = floors.map((f) => f.id);
    log.push(`floors: ${floorIds.length}`);

    const sections = floorIds.length > 0
      ? await prisma.section.findMany({ where: { floorId: { in: floorIds } }, select: { id: true } })
      : [];
    const sectionIds = sections.map((s) => s.id);
    log.push(`sections: ${sectionIds.length}`);

    const seats = sectionIds.length > 0
      ? await prisma.seat.findMany({ where: { sectionId: { in: sectionIds } }, select: { id: true } })
      : [];
    const seatIds = seats.map((s) => s.id);
    log.push(`seats: ${seatIds.length}`);

    const shows = await prisma.show.findMany({ where: { venueId }, select: { id: true } });
    const showIds = shows.map((s) => s.id);
    log.push(`shows: ${showIds.length}`);

    // Delete step by step with raw SQL, logging each step
    const exec = async (label: string, sql: string) => {
      try {
        await prisma.$executeRawUnsafe(sql);
        log.push(`${label}: ok`);
      } catch (e: any) {
        log.push(`${label}: FAILED - ${e.message || e}`);
        throw e;
      }
    };

    if (showIds.length > 0) {
      await exec('del tickets by show', `DELETE FROM Ticket WHERE showId IN (${showIds.join(',')})`);
    }
    if (seatIds.length > 0) {
      await exec('del tickets by seat', `DELETE FROM Ticket WHERE seatId IN (${seatIds.join(',')})`);
    }
    if (showIds.length > 0) {
      await exec('del categories', `DELETE FROM TicketCategory WHERE showId IN (${showIds.join(',')})`);
      await exec('del shows', `DELETE FROM Show WHERE id IN (${showIds.join(',')})`);
    }
    if (seatIds.length > 0) {
      await exec('del seats', `DELETE FROM Seat WHERE id IN (${seatIds.join(',')})`);
    }
    if (sectionIds.length > 0) {
      await exec('del sections', `DELETE FROM Section WHERE id IN (${sectionIds.join(',')})`);
    }
    if (floorIds.length > 0) {
      await exec('del floors', `DELETE FROM Floor WHERE id IN (${floorIds.join(',')})`);
    }
    await exec('del venue', `DELETE FROM Venue WHERE id = ${venueId}`);

    return res.json({ message: 'Salon silindi', log });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Sunucu hatası', detail: error.message || String(error) });
  }
});

// Kat ekleme
router.post('/:id/floors', authenticate, requireAdmin, async (req, res) => {
  try {
    const floor = await prisma.floor.create({
      data: {
        venueId: parseInt(req.params.id),
        name: req.body.name,
        level: req.body.level,
      },
    });
    return res.status(201).json(floor);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Bölüm ekleme
router.post('/:id/floors/:floorId/sections', authenticate, requireAdmin, async (req, res) => {
  try {
    const section = await prisma.section.create({
      data: {
        floorId: parseInt(req.params.floorId),
        name: req.body.name,
        type: req.body.type,
      },
    });
    return res.status(201).json(section);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Toplu koltuk ekleme
router.post('/:id/sections/:sectionId/seats', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = req.body;
    // Supports both formats:
    // Old: { row: "A", count: 20 } → seats 1-20
    // New: { row: "A", start: 21, end: 31, step: 2 } → seats 21,23,25,27,29,31
    const sectionId = parseInt(req.params.sectionId);

    const seats: { sectionId: number; row: string; number: number }[] = [];
    for (const r of rows) {
      if (r.start !== undefined && r.end !== undefined) {
        const step = r.step || 1;
        for (let n = r.start; n <= r.end; n += step) {
          seats.push({ sectionId, row: r.row, number: n });
        }
      } else {
        for (let i = 1; i <= r.count; i++) {
          seats.push({ sectionId, row: r.row, number: i });
        }
      }
    }

    await prisma.seat.createMany({ data: seats });

    const created = await prisma.seat.findMany({
      where: { sectionId },
      orderBy: [{ row: 'asc' }, { number: 'asc' }],
    });

    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;
