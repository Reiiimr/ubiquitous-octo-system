import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-test-secret-test-secret-123456',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://ekapon_api:ekapon_api_test@localhost:5432/ekapon_test',
    },
  },
});
