import 'dotenv/config';
import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform(value => value === 'true');
const env = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8001),
  APP_ORIGIN: z.string().url().default('http://localhost:8001'),
  MYSQL_HOST: z.string().default('127.0.0.1'),
  MYSQL_PORT: z.coerce.number().int().default(3306),
  MYSQL_DATABASE: z.string().regex(/^[a-zA-Z0-9_]+$/).default('poems'),
  MYSQL_USER: z.string().default('poems'),
  MYSQL_PASSWORD: z.string().min(16),
  REDIS_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  ADMIN_USERNAME: z.string().min(3).max(80).default('admin'),
  ADMIN_KEY: z.string().min(5).max(128).default('zmhnb'),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: bool.default(false),
  SMTP_REQUIRE_TLS: bool.default(true),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().min(1),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(2).default(0),
  LEGACY_SQLITE_PATH: z.string().optional()
}).safeParse(process.env);
if (!env.success) throw new Error(`环境变量缺失或无效：${env.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
export const config = { ...env.data, APP_ORIGIN: new URL(env.data.APP_ORIGIN).origin };
