import { z } from 'zod';

const name = z.string().trim().min(1, 'Required').max(80);
const optional = z.string().trim().max(80).optional().transform((v) => (v ? v : undefined));
export const mobile = z.string().trim().regex(/^09\d{2}[-\s]?\d{3}[-\s]?\d{4}$/, 'Use a PH mobile number like 0917-123-4567');

export const createAccount = z.object({
  accountType: z.enum(['Paravet', 'User']),
  firstName: name,
  middleName: optional,
  lastName: name,
  suffix: optional,
  mobile,
  barangay: z.string().trim().min(2).max(60),
  paravetId: z.number().int().positive().optional(),
  ownerId: z.number().int().positive().optional(),
});

export const updateAccount = z.object({
  firstName: name.optional(),
  middleName: z.string().trim().max(80).nullable().optional(),
  lastName: name.optional(),
  suffix: z.string().trim().max(80).nullable().optional(),
  mobile: mobile.optional(),
  barangay: z.string().trim().min(2).max(60).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Send at least one field to change.' });

export const archiveBody = z.object({ ids: z.array(z.number().int().positive()).min(1).max(200), restore: z.boolean().default(false) });

export const accountRef = z.string().regex(/^(\d{1,12}|(PV|US)\d{4}-[A-Za-z0-9]{2,3}[PUpu]\d{3,}-30(23|24))$/, 'Invalid account reference');
