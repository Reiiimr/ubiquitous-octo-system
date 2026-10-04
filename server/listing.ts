import { z } from 'zod';

/** Query parameters shared by every list endpoint (same controls as the prototype's lists). */
export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(25),
  sort: z.string().max(40).optional(),
  dir: z.enum(['asc', 'desc']).default('asc'),
  q: z.string().trim().max(100).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  archived: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
});

export const likePattern = (q: string) => '%' + q.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
