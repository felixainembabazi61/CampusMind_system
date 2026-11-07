import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { pool } from './db.js';
import { requireAuth, asyncRoute } from './middleware.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import appointmentRoutes from './routes/appointments.js';
import intakeRoutes from './routes/intakes.js';
import communityRoutes from './routes/community.js';
import messageRoutes from './routes/messages.js';
import reportRoutes from './routes/reports.js';

dotenv.config();
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters in server/.env');
}
const app=express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({origin:process.env.CLIENT_ORIGIN||'http://localhost:5173',credentials:true}));
app.use(express.json({limit:'32kb'}));
app.use(cookieParser());
app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:true,legacyHeaders:false}),authRoutes);
app.get('/api/health',asyncRoute(async(_req,res)=>{
  await pool.query('SELECT 1');
  res.json({status:'ok',service:'CampusMind API',database:'connected'});
}));
app.use('/api',requireAuth);
app.use('/api/users',userRoutes);
app.use('/api/appointments',appointmentRoutes);
app.use('/api/intakes',intakeRoutes);
app.use('/api/community',communityRoutes);
app.use('/api/messages',messageRoutes);
app.use('/api/reports',reportRoutes);
app.use((req,res)=>res.status(404).json({error:'API route not found.'}));
app.use((err,_req,res,_next)=>{
  if(err?.code==='ER_DUP_ENTRY') return res.status(409).json({error:'That unique value is already in use.'});
  console.error('API error:',err?.message||err);
  res.status(500).json({error:'An unexpected server error occurred.'});
});
const port=Number(process.env.PORT||4000);
app.listen(port,()=>console.log(`CampusMind API listening on http://localhost:${port}`));
