import { jwtVerify, SignJWT } from 'jose';
import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  mockRedisStore: Map<string, { value: string; expiresAt?: number }>;
};

if (!globalForRedis.mockRedisStore) {
  globalForRedis.mockRedisStore = new Map();
}

class MockRedis {
  async get(key: string) {
    const item = globalForRedis.mockRedisStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      globalForRedis.mockRedisStore.delete(key);
      return null;
    }
    return item.value;
  }

  async setex(key: string, seconds: number, value: string) {
    globalForRedis.mockRedisStore.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    return 'OK';
  }

  async incr(key: string) {
    const current = await this.get(key);
    const num = current ? parseInt(current, 10) + 1 : 1;
    const item = globalForRedis.mockRedisStore.get(key);
    globalForRedis.mockRedisStore.set(key, { value: num.toString(), expiresAt: item?.expiresAt });
    return num;
  }

  async expire(key: string, seconds: number) {
    const item = globalForRedis.mockRedisStore.get(key);
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000;
      return 1;
    }
    return 0;
  }
}

export const redis = process.env.NODE_ENV === 'production' 
  ? new Redis(process.env.REDIS_URL || 'redis://localhost:6379') 
  : (new MockRedis() as any);

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'supersecretjwtkey_1234567890');

export async function createToken(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h') // 2 hours timeout
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}
