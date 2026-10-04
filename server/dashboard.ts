import { z } from 'zod';
import { notFound } from './errors';

export const DATASETS = [
  'owners', 'pets', 'paravets', 'respondents', 'households',
  'animals', 'stubs', 'services', 'programs', 'participants',
] as const;

export type Dataset = (typeof DATASETS)[number];

export function dataset(value: string): Dataset {
  if ((DATASETS as readonly string[]).includes(value)) return value as Dataset;
  throw notFound('Dashboard dataset not found.');
}

export const record = z.record(z.string(), z.unknown()).superRefine((value, ctx) => {
  if (typeof value.id !== 'string' && typeof value.id !== 'number') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Each record needs a string or numeric id.', path: ['id'] });
  } else if (typeof value.id === 'string' && (!value.id.trim() || value.id.length > 100)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Record ids must contain 1 to 100 non-blank characters.', path: ['id'] });
  } else if (typeof value.id === 'number' && (!Number.isInteger(value.id) || value.id < 1)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Numeric record ids must be positive integers.', path: ['id'] });
  }
});

export const recordBatch = z.object({ records: z.array(record).min(1).max(100) });
export const archiveBatch = z.object({
  ids: z.array(z.union([z.string().min(1).max(100), z.number().int().positive()])).min(1).max(500),
  archived: z.boolean(),
});
