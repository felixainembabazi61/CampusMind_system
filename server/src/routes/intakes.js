import { Router } from 'express';
import { pool } from '../db.js';
import { allowRoles, asyncRoute } from '../middleware.js';
import { intakeSchema } from '../validation.js';

const router = Router();

router.get('/', asyncRoute(async (req,res) => {
  let sql = `SELECT i.id,i.student_id,i.assigned_counselor_id,i.topic,i.details,i.priority,i.status,
    i.staff_response,i.created_at,s.full_name AS student_name,c.full_name AS counselor_name
    FROM intake_requests i JOIN users s ON s.id=i.student_id
    LEFT JOIN users c ON c.id=i.assigned_counselor_id`;
  let params=[];
  if (req.user.role==='student') { sql+=' WHERE i.student_id=?'; params.push(req.user.id); }
  else if (req.user.role==='counselor') { sql+=' WHERE i.assigned_counselor_id=?'; params.push(req.user.id); }
  sql+=' ORDER BY i.created_at DESC LIMIT 200';
  const [rows]=await pool.execute(sql,params);
  res.json({ requests:rows });
}));

router.post('/', allowRoles('student'), asyncRoute(async (req,res) => {
  const parsed=intakeSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:'Please provide a topic and a longer description.'});
  const v=parsed.data;
  const [result]=await pool.execute(
    'INSERT INTO intake_requests (student_id,topic,details,priority) VALUES (?,?,?,?)',
    [req.user.id,v.topic,v.details,v.priority]
  );
  res.status(201).json({id:result.insertId,message:'Support request submitted.'});
}));

router.patch('/:id', allowRoles('counselor','administrator'), asyncRoute(async(req,res)=>{
  const {status,staffResponse,assignedCounselorId}=req.body||{};
  if(!['submitted','under_review','referred','closed'].includes(status)) return res.status(400).json({error:'Invalid request status.'});
  if(req.user.role==='counselor'){
    const [r]=await pool.execute(
      'UPDATE intake_requests SET status=?,staff_response=? WHERE id=? AND assigned_counselor_id=?',
      [status,typeof staffResponse==='string'?staffResponse.slice(0,5000):null,req.params.id,req.user.id]
    );
    if(!r.affectedRows) return res.status(404).json({error:'Request not found or not assigned to you.'});
  } else {
    const assigned=assignedCounselorId ? Number(assignedCounselorId) : null;
    if(assigned){
      const [c]=await pool.execute("SELECT id FROM users WHERE id=? AND role='counselor' AND is_active=1",[assigned]);
      if(!c.length) return res.status(400).json({error:'Assigned user must be an active counselor.'});
    }
    const [r]=await pool.execute(
      'UPDATE intake_requests SET status=?,staff_response=?,assigned_counselor_id=? WHERE id=?',
      [status,typeof staffResponse==='string'?staffResponse.slice(0,5000):null,assigned,req.params.id]
    );
    if(!r.affectedRows) return res.status(404).json({error:'Request not found.'});
  }
  res.json({message:'Support request updated.'});
}));

export default router;
