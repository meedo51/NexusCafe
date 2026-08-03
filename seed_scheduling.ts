import { db } from './src/db/index.ts';
import { users, scheduledShifts, shiftSwaps, timeOffRequests } from './src/db/schema.ts';

async function seed() {
  try {
    const allUsers = await db.select().from(users).limit(5);
    if (allUsers.length < 2) return;

    await db.delete(shiftSwaps);
    await db.delete(timeOffRequests);
    await db.delete(scheduledShifts);

    const baseDate = new Date(); // next Monday
    const offset = (8 - baseDate.getDay()) % 7; 
    baseDate.setDate(baseDate.getDate() + (offset === 0 ? 1 : offset));

    for (let i = 0; i < 5; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      
      const u1 = allUsers[0];
      const start1 = new Date(d); start1.setHours(8, 0, 0, 0);
      const end1 = new Date(d); end1.setHours(16, 0, 0, 0);
      
      const u2 = allUsers[1];
      const start2 = new Date(d); start2.setHours(14, 0, 0, 0);
      const end2 = new Date(d); end2.setHours(22, 0, 0, 0);
      
      await db.insert(scheduledShifts).values([
        { userId: u1.id, date: d, startTime: start1, endTime: end1, role: u1.role },
        { userId: u2.id, date: d, startTime: start2, endTime: end2, role: u2.role }
      ]);
    }

    const shifts = await db.select().from(scheduledShifts).limit(2);
    if (shifts.length > 1) {
       await db.insert(shiftSwaps).values({
         requestorId: shifts[0].userId,
         requestorShiftId: shifts[0].id,
         targetUserId: shifts[1].userId,
         targetShiftId: shifts[1].id,
         status: 'PENDING'
       });
    }

    await db.insert(timeOffRequests).values({
       userId: allUsers[0].id,
       type: 'ANNUAL_LEAVE',
       startDate: new Date(),
       endDate: new Date(Date.now() + 5*86400000),
       reason: 'Family vacation',
       status: 'PENDING'
    });
    
    console.log("Seeded successfully");
  } catch (e) {
    console.error(e);
  }
}
seed();
