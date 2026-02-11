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
    await prisma.venue.delete({ where: { id: venueId } });
    return res.json({ message: 'Salon silindi' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Sunucu hatası' });
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
