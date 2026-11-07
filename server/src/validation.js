import { z } from 'zod';

export const emailSchema = z.string().trim().email().max(190);
export const passwordSchema = z.string().min(10).max(100);
export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  studentNumber: z.string().trim().max(60).optional().or(z.literal('')),
  department: z.string().trim().max(120).optional().or(z.literal(''))
});
export const appointmentSchema = z.object({
  counselorId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  mode: z.enum(['in_person','online']),
  category: z.string().trim().min(2).max(80),
  note: z.string().trim().max(1000).optional().or(z.literal(''))
});
export const intakeSchema = z.object({
  topic: z.string().trim().min(2).max(100),
  details: z.string().trim().min(12).max(5000),
  priority: z.enum(['normal','timely']).default('normal')
});
export const contentSchema = z.object({
  title: z.string().trim().min(4).max(180),
  category: z.string().trim().min(2).max(80),
  body: z.string().trim().min(12).max(5000)
});
