import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ALLOWED_ORIGINS: z.string().default(''),
  NODE_ENV: z.string().default('development'),
  SESSION_HOURS: z.coerce.number().int().min(1).max(24).default(8),
  LOGIN_IP_MAX_FAILURES: z.coerce.number().int().min(3).max(1000).default(20),
});

export interface Config {
  databaseUrl: string;
  jwtSecret: string;
  allowedOrigins: string[];
  isProd: boolean;
  sessionHours: number;
  loginIpMaxFailures: number;
}

let cached: Config | undefined;

export function config(): Config {
  if (!cached) {
    const r = schema.safeParse(process.env);
    if (!r.success) {
      throw new Error('Invalid environment: ' + r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    }
    const e = r.data;
    cached = {
      databaseUrl: e.DATABASE_URL,
      jwtSecret: e.JWT_SECRET,
      allowedOrigins: e.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
      isProd: e.NODE_ENV === 'production',
      sessionHours: e.SESSION_HOURS,
      loginIpMaxFailures: e.LOGIN_IP_MAX_FAILURES,
    };
  }
  return cached;
}
