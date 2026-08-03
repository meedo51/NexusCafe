import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.ts';
import { users, shifts } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { SecurityService } from '../services/securityService.ts';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nexuscafe-pos-super-secret-key';

router.post('/pin', async (req: Request, res: Response) => {
  try {
    const rateLimit = await SecurityService.checkRateLimit(req);
    if (!rateLimit.allowed) {
      await SecurityService.logEvent('LOGIN_BLOCKED', { reason: 'ip_rate_limit' }, req);
      res.status(429).json({ error: `Too many failed attempts. Try again in ${rateLimit.waitMinutes} minutes.` });
      return;
    }

    const { pin } = req.body;
    
    const allUsers = await db.select().from(users);
    let matchedUser = null;
    let attemptedUser = null; // To track if a user was found but PIN was wrong
    
    // Simplistic check. In a real system, you might want a user identifier first.
    // However, if PINs are unique across the system, this works.
    for (const user of allUsers) {
      if (user.pin && await bcrypt.compare(pin, user.pin)) {
        matchedUser = user;
        break;
      }
    }
    
    // If no match was found, we don't know who they were trying to log in as.
    if (!matchedUser) {
      await SecurityService.logEvent('LOGIN_FAILED', { reason: 'invalid_pin', providedPinLength: pin?.length }, req);
      res.status(401).json({ error: 'Invalid PIN' });
      return;
    }

    if (matchedUser.lockedUntil && new Date(matchedUser.lockedUntil) > new Date()) {
      const waitMinutes = Math.ceil((new Date(matchedUser.lockedUntil).getTime() - new Date().getTime()) / 60000);
      await SecurityService.logEvent('LOGIN_BLOCKED', { reason: 'account_locked', remainingMinutes: waitMinutes }, req, matchedUser.id);
      res.status(403).json({ error: `Account locked. Try again in ${waitMinutes} minutes.` });
      return;
    }

    // Success! Reset attempts.
    await SecurityService.handleSuccessfulLogin(matchedUser, req);

    // Generate JWT
    const token = jwt.sign(
      { id: matchedUser.id, uid: matchedUser.uid, role: matchedUser.role },
      JWT_SECRET,
      { expiresIn: '12h' } // Shift duration limit
    );

    // Check active shift
    const activeShifts = await db.select().from(shifts)
      .where(and(eq(shifts.userId, matchedUser.id), eq(shifts.status, 'ACTIVE')))
      .limit(1);

    res.json({
      token,
      user: {
        id: matchedUser.id,
        uid: matchedUser.uid,
        email: matchedUser.email,
        name: matchedUser.name,
        role: matchedUser.role
      },
      shift: activeShifts[0] || null
    });

  } catch (error: any) {
    console.error('PIN login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// For demonstration, an endpoint to setup initial user PINs
router.post('/setup-pin', async (req, res) => {
  const { email, pin } = req.body;
  const hashedPin = await bcrypt.hash(pin, 12);
  await db.update(users).set({ pin: hashedPin }).where(eq(users.email, email));
  res.json({ success: true });
});

export default router;
