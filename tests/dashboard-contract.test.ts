import { describe, expect, it } from 'vitest';
import { AppError } from '../server/errors';
import { archiveBatch, DATASETS, dataset, recordBatch } from '../server/dashboard';

describe('dashboard record contract', () => {
  it('only resolves server-approved datasets', () => {
    expect(dataset('owners')).toBe('owners');
    expect(() => dataset('accounts')).toThrow(AppError);
    expect(DATASETS).not.toContain('prelistings');
  });

  it('requires stable record ids and bounds write batches', () => {
    expect(recordBatch.safeParse({ records: [{ id: 'OWN-1', name: 'Example' }] }).success).toBe(true);
    expect(recordBatch.safeParse({ records: [{ name: 'Missing id' }] }).success).toBe(false);
    expect(recordBatch.safeParse({ records: [] }).success).toBe(false);
    expect(recordBatch.safeParse({ records: Array.from({ length: 101 }, (_, i) => ({ id: String(i) })) }).success).toBe(false);
  });

  it('validates archive identifiers and state', () => {
    expect(archiveBatch.safeParse({ ids: ['OWN-1', 2], archived: true }).success).toBe(true);
    expect(archiveBatch.safeParse({ ids: [], archived: true }).success).toBe(false);
    expect(archiveBatch.safeParse({ ids: ['OWN-1'], archived: 'yes' }).success).toBe(false);
  });
});
