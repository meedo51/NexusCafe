require('dotenv').config();
const { Pool } = require('pg');

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // get users
    const { rows: users } = await pool.query('SELECT id, role FROM users LIMIT 5');
    if (users.length < 2) {
      console.log("Not enough users to seed scheduling");
      return;
    }
    
    console.log(`Found ${users.length} users`);

    // clear scheduling tables
    await pool.query('DELETE FROM shift_swaps');
    await pool.query('DELETE FROM time_off_requests');
    await pool.query('DELETE FROM scheduled_shifts');
    
    // insert shifts for next week
    const shifts = [];
    const baseDate = new Date(); // next Monday
    const offset = (8 - baseDate.getDay()) % 7; 
    baseDate.setDate(baseDate.getDate() + (offset === 0 ? 1 : offset));
    
    for (let i = 0; i < 5; i++) { // 5 days
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      
      const u1 = users[0];
      const start1 = new Date(d); start1.setHours(8, 0, 0, 0);
      const end1 = new Date(d); end1.setHours(16, 0, 0, 0);
      shifts.push(`(${u1.id}, '${d.toISOString()}', '${start1.toISOString()}', '${end1.toISOString()}', '${u1.role}')`);
      
      const u2 = users[1];
      const start2 = new Date(d); start2.setHours(14, 0, 0, 0);
      const end2 = new Date(d); end2.setHours(22, 0, 0, 0);
      shifts.push(`(${u2.id}, '${d.toISOString()}', '${start2.toISOString()}', '${end2.toISOString()}', '${u2.role}')`);
    }
    
    if (shifts.length > 0) {
      await pool.query(`INSERT INTO scheduled_shifts (user_id, date, start_time, end_time, role) VALUES ${shifts.join(',')}`);
      console.log("Inserted shifts");
    }

    // insert shift swap
    const { rows: allShifts } = await pool.query('SELECT id, user_id FROM scheduled_shifts LIMIT 2');
    if (allShifts.length > 1) {
       await pool.query(`INSERT INTO shift_swaps (requestor_id, requestor_shift_id, target_user_id, target_shift_id, status) VALUES (${allShifts[0].user_id}, ${allShifts[0].id}, ${allShifts[1].user_id}, ${allShifts[1].id}, 'PENDING')`);
       console.log("Inserted shift swap");
    }
    
    // time off requests
    await pool.query(`INSERT INTO time_off_requests (user_id, type, start_date, end_date, reason, status) VALUES (${users[0].id}, 'ANNUAL_LEAVE', '${new Date().toISOString()}', '${new Date(Date.now() + 5*86400000).toISOString()}', 'Family vacation', 'PENDING')`);
    console.log("Inserted time off");
    
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

seed();
