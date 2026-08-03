import express from 'express';
import { db } from '../db/index.ts';
import { scheduledShifts, shiftSwaps, employeeAvailability, timeOffRequests, users, shiftTrades, blackoutDates } from '../db/schema.ts';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { requirePosAuth } from './shifts.ts';

const router = express.Router();

router.use(requirePosAuth);

// SHIFTS
router.get('/shifts', async (req, res) => {
  try {
    const { start, end } = req.query;
    let query = db.select({
      shift: scheduledShifts,
      user: users
    }).from(scheduledShifts).innerJoin(users, eq(scheduledShifts.userId, users.id));

    if (start && end) {
       // Filter by date range if needed
       // Assuming start and end are ISO strings
       query = query.where(and(
         gte(scheduledShifts.date, new Date(start as string)),
         lte(scheduledShifts.date, new Date(end as string))
       )) as any;
    }

    const shifts = await query;
    res.json(shifts.map(s => ({ ...s.shift, employee: s.user })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/shifts', async (req, res) => {
  try {
    const { userId, date, startTime, endTime, role } = req.body;
    const [newShift] = await db.insert(scheduledShifts).values({
      userId,
      date: new Date(date),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      role
    }).returning();
    res.json(newShift);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// SWAPS
router.get('/swaps', async (req, res) => {
  try {
    const swaps = await db.select({
      swap: shiftSwaps,
      requestor: users,
    }).from(shiftSwaps)
    .innerJoin(users, eq(shiftSwaps.requestorId, users.id))
    .orderBy(desc(shiftSwaps.createdAt));

    // For full details we would need to join target user, and shifts.
    // For simplicity, we fetch all users and shifts and map them below (or do multiple joins)
    const allUsers = await db.select().from(users);
    const allShifts = await db.select().from(scheduledShifts);

    const enrichedSwaps = swaps.map(s => {
      const targetUser = allUsers.find(u => u.id === s.swap.targetUserId);
      const reqShift = allShifts.find(sh => sh.id === s.swap.requestorShiftId);
      const targetShift = s.swap.targetShiftId ? allShifts.find(sh => sh.id === s.swap.targetShiftId) : null;

      return {
        ...s.swap,
        requestor: s.requestor,
        targetUser,
        requestorShift: reqShift,
        targetShift
      };
    });

    res.json(enrichedSwaps);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/swaps', async (req, res) => {
  try {
    const { requestorShiftId, targetUserId, targetShiftId } = req.body;
    const requestorId = (req as any).user.id;
    const [newSwap] = await db.insert(shiftSwaps).values({
      requestorId,
      requestorShiftId,
      targetUserId,
      targetShiftId: targetShiftId || null,
      status: 'PENDING'
    }).returning();
    res.json(newSwap);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/swaps/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    const [updated] = await db.update(shiftSwaps).set({ status }).where(eq(shiftSwaps.id, parseInt(id))).returning();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AVAILABILITY
router.get('/availability', async (req, res) => {
  try {
    // Return all or filter by current user
    const { userId } = req.query;
    let query = db.select().from(employeeAvailability);
    if (userId) {
       query = query.where(eq(employeeAvailability.userId, parseInt(userId as string))) as any;
    }
    const avs = await query;
    res.json(avs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/availability', async (req, res) => {
  try {
    const { availability } = req.body; // Array of availability settings
    const userId = (req as any).user.id;
    
    // Simple approach: delete existing and insert new
    await db.delete(employeeAvailability).where(eq(employeeAvailability.userId, userId));
    
    if (availability && availability.length > 0) {
      const toInsert = availability.map((a: any) => ({
        userId,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        isUnavailable: a.isUnavailable
      }));
      await db.insert(employeeAvailability).values(toInsert);
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// TIME OFF
router.get('/timeoff', async (req, res) => {
  try {
    const timeOffs = await db.select({
      request: timeOffRequests,
      user: users
    }).from(timeOffRequests).innerJoin(users, eq(timeOffRequests.userId, users.id)).orderBy(desc(timeOffRequests.createdAt));
    res.json(timeOffs.map(t => ({ ...t.request, employee: t.user })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/timeoff', async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const userId = (req as any).user.id;
    const [newRequest] = await db.insert(timeOffRequests).values({
      userId,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: 'PENDING'
    }).returning();
    res.json(newRequest);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// SHIFT TRADES
router.get('/trades', async (req, res) => {
  try {
    const trades = await db.select({
      trade: shiftTrades,
      requestor: users,
    }).from(shiftTrades)
    .innerJoin(users, eq(shiftTrades.requestorId, users.id))
    .orderBy(desc(shiftTrades.createdAt));
    
    const allUsers = await db.select().from(users);
    const allShifts = await db.select().from(scheduledShifts);
    
    const enrichedTrades = trades.map(t => {
      const acceptorUser = t.trade.acceptorId ? allUsers.find(u => u.id === t.trade.acceptorId) : null;
      const shift = allShifts.find(sh => sh.id === t.trade.shiftId);
      return {
        ...t.trade,
        requestor: t.requestor,
        acceptorUser,
        shift
      };
    });
    res.json(enrichedTrades);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/trades', async (req, res) => {
  try {
    const { shiftId } = req.body;
    const requestorId = (req as any).user.id;
    const [newTrade] = await db.insert(shiftTrades).values({
      requestorId,
      shiftId,
      status: 'OPEN'
    }).returning();
    res.json(newTrade);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/trades/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const acceptorId = (req as any).user.id;
    const [updated] = await db.update(shiftTrades)
      .set({ acceptorId, status: 'PENDING_APPROVAL' })
      .where(eq(shiftTrades.id, parseInt(id)))
      .returning();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/trades/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const managerApprovalId = (req as any).user.id;
    
    // Validate coverage requirements
    const [trade] = await db.select().from(shiftTrades).where(eq(shiftTrades.id, parseInt(id)));
    if (!trade || !trade.acceptorId) {
      return res.status(400).json({ error: "Invalid trade state" });
    }

    const [shift] = await db.select().from(scheduledShifts).where(eq(scheduledShifts.id, trade.shiftId));
    if (shift) {
      const acceptorShifts = await db.select().from(scheduledShifts)
        .where(
          and(
            eq(scheduledShifts.userId, trade.acceptorId),
            eq(scheduledShifts.date, shift.date)
          )
        );
      
      if (acceptorShifts.length > 0) {
        return res.status(400).json({ error: "Acceptor already has a shift on this day (coverage conflict)." });
      }
    }

    const [updated] = await db.update(shiftTrades)
      .set({ managerApprovalId, status: 'APPROVED' })
      .where(eq(shiftTrades.id, parseInt(id)))
      .returning();
      
    // Re-assign shift
    await db.update(scheduledShifts)
      .set({ userId: trade.acceptorId })
      .where(eq(scheduledShifts.id, trade.shiftId));
      
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/trades/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const managerApprovalId = (req as any).user.id;
    const [updated] = await db.update(shiftTrades)
      .set({ managerApprovalId, status: 'REJECTED' })
      .where(eq(shiftTrades.id, parseInt(id)))
      .returning();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// BLACKOUT DATES
router.get('/blackouts', async (req, res) => {
  try {
    const blackouts = await db.select().from(blackoutDates).orderBy(desc(blackoutDates.date));
    res.json(blackouts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/blackouts', async (req, res) => {
  try {
    const { date, reason } = req.body;
    const userId = (req as any).user.id;
    const [newBlackout] = await db.insert(blackoutDates).values({
      userId,
      date: new Date(date),
      reason
    }).returning();
    res.json(newBlackout);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
