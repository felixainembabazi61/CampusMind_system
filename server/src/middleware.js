import jwt from 'jsonwebtoken';
import { pool } from './db.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[process.env.COOKIE_NAME || 'campusmind_session'];
  if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.execute(
      'SELECT id,email,role FROM users WHERE id=? AND is_active=1 LIMIT 1',
      [claims.id]
    );
    if (!rows.length) return res.status(401).json({ error: 'This account is inactive. Contact the university administrator.' });
    // Always trust the current database role, not a possibly stale role embedded in a cookie.
    req.user = { id: rows[0].id, email: rows[0].email, role: rows[0].role };
    next();
  } catch (error) {
    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    next(error);
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function publicUser(row) {
  return {
    id: row.id, fullName: row.full_name, email: row.email, role: row.role,
    department: row.department, studentNumber: row.student_number
  };
}
