import { Router } from 'express';
import { pool } from '../db.js';
import { allowRoles, asyncRoute } from '../middleware.js';
import { contentSchema } from '../validation.js';

const router=Router();

router.get('/stories/pending', allowRoles('peer_mentor','administrator'), asyncRoute(async(_req,res)=>{
  const [rows]=await pool.execute(
    `SELECT s.id,s.title,s.category,s.body,s.created_at,u.full_name AS author
     FROM peer_stories s JOIN users u ON u.id=s.author_id
     WHERE s.status='pending' ORDER BY s.created_at ASC LIMIT 100`
  );
  res.json({stories:rows});
}));
router.get('/stories', asyncRoute(async(_req,res)=>{
  const [rows]=await pool.execute(
    `SELECT s.id,s.title,s.category,s.body,s.created_at,u.full_name AS author
     FROM peer_stories s JOIN users u ON u.id=s.author_id
     WHERE s.status='published' ORDER BY s.created_at DESC LIMIT 100`
  );
  res.json({stories:rows});
}));
router.post('/stories', allowRoles('student','peer_mentor'), asyncRoute(async(req,res)=>{
  const p=contentSchema.safeParse(req.body);
  if(!p.success) return res.status(400).json({error:'Please complete the story fields.'});
  const [r]=await pool.execute(
    'INSERT INTO peer_stories (author_id,title,category,body,status) VALUES (?,?,?,?,?)',
    [req.user.id,p.data.title,p.data.category,p.data.body,'pending']
  );
  res.status(201).json({id:r.insertId,message:'Story submitted for moderation.'});
}));
router.patch('/stories/:id/moderate', allowRoles('peer_mentor','administrator'), asyncRoute(async(req,res)=>{
  const {status}=req.body||{};
  if(!['published','rejected'].includes(status)) return res.status(400).json({error:'Invalid moderation action.'});
  const [r]=await pool.execute('UPDATE peer_stories SET status=? WHERE id=?',[status,req.params.id]);
  if(!r.affectedRows) return res.status(404).json({error:'Story not found.'});
  res.json({message:'Story moderation updated.'});
}));
router.get('/posts', asyncRoute(async(_req,res)=>{
  const [rows]=await pool.execute(
    `SELECT p.id,p.title,p.category,p.body,p.created_at,u.full_name AS author
     FROM forum_posts p JOIN users u ON u.id=p.author_id
     WHERE p.status='published' ORDER BY p.created_at DESC LIMIT 100`
  );
  res.json({posts:rows});
}));
router.post('/posts', allowRoles('student','peer_mentor','counselor'), asyncRoute(async(req,res)=>{
  const p=contentSchema.safeParse(req.body);
  if(!p.success) return res.status(400).json({error:'Please complete the discussion fields.'});
  const [r]=await pool.execute(
    'INSERT INTO forum_posts (author_id,title,category,body) VALUES (?,?,?,?)',
    [req.user.id,p.data.title,p.data.category,p.data.body]
  );
  res.status(201).json({id:r.insertId,message:'Discussion published.'});
}));
router.post('/posts/:id/comments', allowRoles('student','peer_mentor','counselor'), asyncRoute(async(req,res)=>{
  const body=typeof req.body?.body==='string'?req.body.body.trim():'';
  if(body.length<2||body.length>2000) return res.status(400).json({error:'Comment must be between 2 and 2000 characters.'});
  const [p]=await pool.execute("SELECT id FROM forum_posts WHERE id=? AND status='published'",[req.params.id]);
  if(!p.length) return res.status(404).json({error:'Discussion not found.'});
  const [r]=await pool.execute('INSERT INTO forum_comments (post_id,author_id,body) VALUES (?,?,?)',[req.params.id,req.user.id,body]);
  res.status(201).json({id:r.insertId});
}));
router.get('/posts/:id/comments', asyncRoute(async(req,res)=>{
  const [rows]=await pool.execute(
    `SELECT c.id,c.body,c.created_at,u.full_name AS author FROM forum_comments c
     JOIN users u ON u.id=c.author_id WHERE c.post_id=? AND c.status='published' ORDER BY c.created_at`,
    [req.params.id]
  );
  res.json({comments:rows});
}));
router.patch('/posts/:id/moderate', allowRoles('peer_mentor','administrator'), asyncRoute(async(req,res)=>{
  const {status}=req.body||{};
  if(!['published','hidden'].includes(status)) return res.status(400).json({error:'Invalid moderation action.'});
  const [r]=await pool.execute('UPDATE forum_posts SET status=? WHERE id=?',[status,req.params.id]);
  if(!r.affectedRows) return res.status(404).json({error:'Discussion not found.'});
  res.json({message:'Discussion moderation updated.'});
}));
export default router;
