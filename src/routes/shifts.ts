import { Router } from 'express';
import { db } from '../db/index.ts';
import { shifts, breaks } from '../db/schema.ts';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';
import { SecurityService } from '../services/securityService.ts';

const router = Router();

// Require our custom JWT middleware for POS routes
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'nexuscafe-pos-super-secret-key';

export const requirePosAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/clock-in', requirePosAuth, async (req: AuthRequest, res) => {
  try {
    const { openingBalance } = req.body;
    const userId = (req.user as any).id;

    // Check if already clocked in
    const existing = await db.select().from(shifts)
      .where(and(eq(shifts.userId, userId), eq(shifts.status, 'ACTIVE')));
    
    if (existing.length > 0) {
      res.status(400).json({ error: 'Already clocked in' });
      return;
    }

    const [newShift] = await db.insert(shifts).values({
      userId,
      openingBalance: openingBalance.toString(),
      status: 'ACTIVE',
    }).returning();
    
    await SecurityService.logEvent('CLOCK_IN', { shiftId: newShift.id, openingBalance }, req as any, userId);

    res.json(newShift);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/clock-out', requirePosAuth, async (req: AuthRequest, res) => {
  try {
    const { closingBalance } = req.body;
    const userId = (req.user as any).id;

    const activeShifts = await db.select().from(shifts)
      .where(and(eq(shifts.userId, userId), eq(shifts.status, 'ACTIVE')));
    
    if (activeShifts.length === 0) {
      res.status(400).json({ error: 'Not clocked in' });
      return;
    }

    const shift = activeShifts[0];
    
    // In a real system we'd calculate expected balance from transactions during this shift
    const expectedBalance = parseFloat(shift.openingBalance); // Simplified
    const actualClosing = parseFloat(closingBalance);
    const discrepancy = actualClosing - expectedBalance;

    const [updatedShift] = await db.update(shifts).set({
      status: 'CLOSED',
      clockOut: new Date(),
      closingBalance: closingBalance.toString(),
      discrepancy: discrepancy.toString(),
    }).where(eq(shifts.id, shift.id)).returning();
    
    if (Math.abs(discrepancy) > 50) { // e.g. > 50 SAR
      await SecurityService.createAlert('LARGE_DISCREPANCY', `User ${userId} closed shift ${shift.id} with discrepancy of ${discrepancy} SAR`);
    }
    
    await SecurityService.logEvent('CLOCK_OUT', { shiftId: shift.id, closingBalance, discrepancy }, req as any, userId);

    res.json(updatedShift);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
