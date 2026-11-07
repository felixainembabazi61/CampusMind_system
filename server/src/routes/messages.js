import { Router } from 'express';
import { pool } from '../db.js';
import { allowRoles, asyncRoute } from '../middleware.js';

const router=Router();

router.get('/conversations', asyncRoute(async(req,res)=>{
  let sql=`SELECT c.id,c.student_id,c.counselor_id,s.full_name AS student_name,
    u.full_name AS counselor_name
    FROM conversations c JOIN users s ON s.id=c.student_id JOIN users u ON u.id=c.counselor_id`;
  let params=[];
  if(req.user.role==='student'){sql+=' WHERE c.student_id=?';params.push(req.user.id);}
  else if(req.user.role==='counselor'){sql+=' WHERE c.counselor_id=?';params.push(req.user.id);}
  else if(req.user.role==='peer_mentor') return res.json({conversations:[]});
  sql+=' ORDER BY c.created_at DESC LIMIT 100';
  const [rows]=await pool.execute(sql,params);
  res.json({conversations:rows});
}));

router.post('/conversations', allowRoles('student'), asyncRoute(async(req,res)=>{
  const counselorId=Number(req.body?.counselorId);
  const [c]=await pool.execute("SELECT id FROM users WHERE id=? AND role='counselor' AND is_active=1",[counselorId]);
  if(!c.length) return res.status(400).json({error:'Choose an active counselor.'});
  await pool.execute('INSERT IGNORE INTO conversations (student_id,counselor_id) VALUES (?,?)',[req.user.id,counselorId]);
  const [rows]=await pool.execute('SELECT id FROM conversations WHERE student_id=? AND counselor_id=?',[req.user.id,counselorId]);
  res.status(201).json({conversationId:rows[0].id});
}));

async function canAccessConversation(id,user){
  const [rows]=await pool.execute('SELECT student_id,counselor_id FROM conversations WHERE id=?',[id]);
  if(!rows.length) return false;
  if(user.role==='administrator') return true;
  return Number(rows[0].student_id)===Number(user.id)||Number(rows[0].counselor_id)===Number(user.id);
}
router.get('/conversations/:id/messages', asyncRoute(async(req,res)=>{
  if(!(await canAccessConversation(req.params.id,req.user))) return res.status(403).json({error:'You cannot access this conversation.'});
  const [rows]=await pool.execute(
    `SELECT m.id,m.sender_id,m.body,m.created_at,u.full_name AS sender_name
     FROM messages m JOIN users u ON u.id=m.sender_id
     WHERE m.conversation_id=? ORDER BY m.created_at ASC LIMIT 300`,[req.params.id]
  );
  res.json({messages:rows});
}));
router.post('/conversations/:id/messages', asyncRoute(async(req,res)=>{
  if(!(await canAccessConversation(req.params.id,req.user))) return res.status(403).json({error:'You cannot access this conversation.'});
  const body=typeof req.body?.body==='string'?req.body.body.trim():'';
  if(body.length<1||body.length>4000) return res.status(400).json({error:'Message must be between 1 and 4000 characters.'});
  const [r]=await pool.execute('INSERT INTO messages (conversation_id,sender_id,body) VALUES (?,?,?)',[req.params.id,req.user.id,body]);
  res.status(201).json({id:r.insertId,message:'Message sent.'});
}));
export default router;
