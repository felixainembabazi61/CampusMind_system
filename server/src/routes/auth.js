import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { asyncRoute, publicUser, requireAuth } from '../middleware.js';
import { registerSchema, emailSchema, passwordSchema } from '../validation.js';

const router = Router();
const cookieName = () => process.env.COOKIE_NAME || 'campusmind_session';

const cookieOptions = () => ({
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000
});

function issueCookie(res, user) {
  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET, { expiresIn: '8h', issuer: 'campusmind-local' }
  );
  res.cookie(cookieName(), token, cookieOptions());
}

router.post('/register', asyncRoute(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please check the registration details.' });
  const { fullName, email, password, studentNumber, department } = parsed.data;
  const [exists] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()]);
  if (exists.length) return res.status(409).json({ error: 'An account with this email already exists.' });
  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute(
    `INSERT INTO users (full_name,email,password_hash,role,student_number,department)
     VALUES (?,?,?,'student',?,?)`,
    [fullName, email.toLowerCase(), hash, studentNumber || null, department || null]
  );
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
  issueCookie(res, rows[0]);
  res.status(201).json({ user: publicUser(rows[0]) });
}));

router.post('/login', asyncRoute(async (req, res) => {
  const email = emailSchema.safeParse(req.body?.email);
  const password = passwordSchema.safeParse(req.body?.password);
  if (!email.success || !password.success) return res.status(400).json({ error: 'Enter a valid email and password.' });
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email.data.toLowerCase()]);
  const user = rows[0];
  if (!user || !user.is_active || !(await bcrypt.compare(password.data, user.password_hash))) {
    return res.status(401).json({ error: 'The email or password is incorrect.' });
  }
  issueCookie(res, user);
  res.json({ user: publicUser(user) });
}));

router.post('/logout', (req, res) => {
  res.clearCookie(cookieName(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
  res.json({ message: 'Signed out.' });
});

router.get('/me', requireAuth, asyncRoute(async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ? AND is_active = 1', [req.user.id]);
  if (!rows[0]) return res.status(401).json({ error: 'Account is unavailable.' });
  res.json({ user: publicUser(rows[0]) });
}));

export default router;
