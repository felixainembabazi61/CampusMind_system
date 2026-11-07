import { Router } from 'express';
import { pool } from '../db.js';
import { allowRoles, asyncRoute } from '../middleware.js';
import { appointmentSchema } from '../validation.js';

const router = Router();

router.get('/', asyncRoute(async (req, res) => {
  let sql = `SELECT a.*, s.full_name AS student_name, c.full_name AS counselor_name
    FROM appointments a JOIN users s ON s.id=a.student_id JOIN users c ON c.id=a.counselor_id`;
  let params = [];
  if (req.user.role === 'student') { sql += ' WHERE a.student_id=?'; params.push(req.user.id); }
  else if (req.user.role === 'counselor') { sql += ' WHERE a.counselor_id=?'; params.push(req.user.id); }
  sql += ' ORDER BY a.appointment_date DESC,a.appointment_time DESC LIMIT 300';
  const [rows] = await pool.execute(sql, params);
  res.json({ appointments: rows });
}));

router.post('/', allowRoles('student'), asyncRoute(async (req, res) => {
  const parsed = appointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please provide valid appointment details.' });
  const a = parsed.data;
  const [staff] = await pool.execute("SELECT id FROM users WHERE id=? AND role='counselor' AND is_active=1", [a.counselorId]);
  if (!staff.length) return res.status(400).json({ error: 'Select an available counselor.' });
  const [result] = await pool.execute(
    `INSERT INTO appointments (student_id,counselor_id,appointment_date,appointment_time,session_mode,reason_category,student_note)
     VALUES (?,?,?,?,?,?,?)`,
    [req.user.id,a.counselorId,a.date,a.time,a.mode,a.category,a.note || null]
  );
  res.status(201).json({ id:result.insertId, message:'Appointment request submitted.' });
}));

router.patch('/:id/status', allowRoles('counselor','administrator'), asyncRoute(async (req, res) => {
  const { status, response } = req.body || {};
  if (!['approved','declined','completed','cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid appointment status.' });
  let sql = 'UPDATE appointments SET status=?, counselor_response=? WHERE id=?';
  const params = [status, typeof response === 'string' ? response.slice(0,1000) : null, req.params.id];
  if (req.user.role === 'counselor') { sql += ' AND counselor_id=?'; params.push(req.user.id); }
  const [result] = await pool.execute(sql, params);
  if (!result.affectedRows) return res.status(404).json({ error: 'Appointment not found or not assigned to you.' });
  res.json({ message:'Appointment updated.' });
}));

router.delete('/:id', allowRoles('student','administrator'), asyncRoute(async (req, res) => {
  let sql = "UPDATE appointments SET status='cancelled' WHERE id=? AND status IN ('pending','approved')";
  const params = [req.params.id];
  if (req.user.role === 'student') { sql += ' AND student_id=?'; params.push(req.user.id); }
  const [result] = await pool.execute(sql, params);
  if (!result.affectedRows) return res.status(404).json({ error:'Appointment not found or cannot be cancelled.' });
  res.json({ message:'Appointment cancelled.' });
}));

export default router;
