import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { allowRoles, asyncRoute, publicUser } from '../middleware.js';
import { emailSchema, passwordSchema } from '../validation.js';

const router = Router();

router.get('/counselors', asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute(
    `SELECT id,full_name,department FROM users
     WHERE role='counselor' AND is_active=1 ORDER BY full_name`
  );
  res.json({ counselors: rows.map(r => ({ id:r.id, fullName:r.full_name, department:r.department })) });
}));

router.get('/', allowRoles('administrator'), asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute(
    `SELECT id,full_name,email,role,department,student_number,is_active,created_at
     FROM users ORDER BY created_at DESC LIMIT 300`
  );
  res.json({ users: rows.map(r => ({ id:r.id,fullName:r.full_name,email:r.email,role:r.role,department:r.department,studentNumber:r.student_number,isActive:!!r.is_active,createdAt:r.created_at })) });
}));

router.post('/', allowRoles('administrator'), asyncRoute(async (req, res) => {
  const { fullName, email, password, role, department } = req.body || {};
  if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.length > 120 ||
      !emailSchema.safeParse(email).success || !passwordSchema.safeParse(password).success ||
      !['counselor','peer_mentor','administrator'].includes(role)) {
    return res.status(400).json({ error: 'Provide a valid name, email, password and permitted staff role.' });
  }
  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute(
    'INSERT INTO users (full_name,email,password_hash,role,department) VALUES (?,?,?,?,?)',
    [fullName.trim(), email.toLowerCase(), hash, role, typeof department === 'string' ? department.slice(0,120) : null]
  );
  const [rows] = await pool.execute('SELECT * FROM users WHERE id=?', [result.insertId]);
  res.status(201).json({ user: publicUser(rows[0]) });
}));

router.patch('/:id/status', allowRoles('administrator'), asyncRoute(async (req, res) => {
  const active = req.body?.isActive === true ? 1 : req.body?.isActive === false ? 0 : null;
  if (active === null) return res.status(400).json({ error: 'isActive must be true or false.' });
  if (Number(req.params.id) === Number(req.user.id) && active === 0) return res.status(400).json({ error: 'You cannot deactivate your own account.' });
  const [result] = await pool.execute('UPDATE users SET is_active=? WHERE id=?', [active, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'User not found.' });
  res.json({ message: 'Account status updated.' });
}));

export default router;
