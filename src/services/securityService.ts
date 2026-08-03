import { db } from '../db/index.ts';
import { users, auditLogs, securityAlerts } from '../db/schema.ts';
import { eq, desc, and, gt } from 'drizzle-orm';
import { Request } from 'express';

export class SecurityService {
  static async logEvent(
    eventType: string,
    details: any,
    req?: Request,
    userId?: number
  ) {
    try {
      const ipAddress = req?.ip || req?.socket?.remoteAddress;
      const deviceFingerprint = req?.headers['user-agent'];

      await db.insert(auditLogs).values({
        userId,
        eventType,
        details,
        ipAddress,
        deviceFingerprint,
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  static async createAlert(type: string, message: string) {
    try {
      await db.insert(securityAlerts).values({
        type,
        message,
      });
    } catch (error) {
      console.error('Failed to create security alert:', error);
    }
  }

  static async checkRateLimit(req: Request) {
    const ipAddress = req?.ip || req?.socket?.remoteAddress;
    if (!ipAddress) return { allowed: true };

    // Check failed attempts from this IP in the last 15 minutes
    const fifteenMinsAgo = new Date();
    fifteenMinsAgo.setMinutes(fifteenMinsAgo.getMinutes() - 15);

    const recentFailures = await db.select().from(auditLogs)
      .where(
        and(
          eq(auditLogs.ipAddress, ipAddress),
          eq(auditLogs.eventType, 'LOGIN_FAILED'),
          gt(auditLogs.createdAt, fifteenMinsAgo)
        )
      );

    const MAX_FAILURES = 10;
    
    if (recentFailures.length >= MAX_FAILURES) {
      await this.createAlert('IP_LOCKOUT', `IP ${ipAddress} locked out after ${recentFailures.length} failed attempts.`);
      return { allowed: false, remainingAttempts: 0, waitMinutes: 15 };
    }

    return { allowed: true, remainingAttempts: Math.max(0, MAX_FAILURES - recentFailures.length) };
  }

  static async handleSuccessfulLogin(user: any, req: Request) {
    await db.update(users)
      .set({ pinAttempts: 0, lockedUntil: null })
      .where(eq(users.id, user.id));
      
    await SecurityService.logEvent('LOGIN_SUCCESS', {}, req, user.id);
  }
}
