export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export const badRequest = (m: string, d?: unknown) => new AppError(400, 'BAD_REQUEST', m, d);
export const unauthenticated = (m = 'Please sign in.') => new AppError(401, 'UNAUTHENTICATED', m);
export const forbidden = (m = 'You do not have permission to do this.') => new AppError(403, 'FORBIDDEN', m);
export const notFound = (m = 'Not found.') => new AppError(404, 'NOT_FOUND', m);
export const conflict = (code: string, m: string, d?: unknown) => new AppError(409, code, m, d);
export const unprocessable = (code: string, m: string, d?: unknown) => new AppError(422, code, m, d);

/** Translates PostgreSQL errors into safe API errors. Messages raised by our own functions (no constraint name) are user-facing. */
export function fromDb(e: unknown): AppError | null {
  const err = e as { code?: string; message?: string; constraint_name?: string };
  if (!err || typeof err.code !== 'string') return null;
  const hasConstraint = Boolean(err.constraint_name);
  switch (err.code) {
    case '23505':
      return new AppError(409, 'CONFLICT', 'That record already exists.');
    case '23503':
      return new AppError(422, 'INVALID_REFERENCE', 'A referenced record does not exist or is still in use.');
    case '23502':
      return new AppError(422, 'REQUIRED_FIELD', 'A required value is missing.');
    case '23514':
    case '22023':
      return new AppError(422, 'RULE_VIOLATION', hasConstraint ? 'A value is not allowed by the data rules.' : err.message ?? 'Rule violation.',
        hasConstraint ? { constraint: err.constraint_name } : undefined);
    case '22P02':
    case '22007':
    case '22008':
      return new AppError(422, 'INVALID_VALUE', 'A value has the wrong format.');
    case '42501':
      return new AppError(403, 'FORBIDDEN', hasConstraint ? 'Not allowed.' : err.message ?? 'Not allowed.');
    default:
      return null;
  }
}
