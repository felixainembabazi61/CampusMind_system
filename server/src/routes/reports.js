import { Router } from 'express';
import { pool } from '../db.js';
import { allowRoles, asyncRoute } from '../middleware.js';
const router=Router();
router.get('/summary',allowRoles('administrator'),asyncRoute(async(_req,res)=>{
  const [[users]]=await pool.query('SELECT COUNT(*) AS total FROM users WHERE is_active=1');
  const [[students]]=await pool.query("SELECT COUNT(*) AS total FROM users WHERE role='student' AND is_active=1");
  const [[counselors]]=await pool.query("SELECT COUNT(*) AS total FROM users WHERE role='counselor' AND is_active=1");
  const [[appointments]]=await pool.query("SELECT COUNT(*) AS total FROM appointments WHERE status IN ('pending','approved')");
  const [[intakes]]=await pool.query("SELECT COUNT(*) AS total FROM intake_requests WHERE status IN ('submitted','under_review')");
  const [[stories]]=await pool.query("SELECT COUNT(*) AS total FROM peer_stories WHERE status='pending'");
  res.json({users:users.total,students:students.total,counselors:counselors.total,activeAppointments:appointments.total,openIntakes:intakes.total,pendingStories:stories.total});
}));
export default router;
