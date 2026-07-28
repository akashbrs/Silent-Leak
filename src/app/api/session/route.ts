import { NextResponse } from 'next/server';
import { createToken, redis } from '@/lib/auth';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const sessionId = crypto.randomUUID();
    
    // Store empty solved array in Redis
    await redis.setex(`session:${sessionId}`, 7200, JSON.stringify([]));

    // Create JWT
    const token = await createToken({ sessionId });

    // Set Cookie
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 2 * 60 * 60, // 2 hours
      path: '/'
    });

    // Generate CSRF Token and store in Redis mapped to SessionID
    const csrfToken = crypto.randomBytes(32).toString('hex');
    await redis.setex(`csrf:${sessionId}`, 7200, csrfToken);

    return NextResponse.json({ success: true, csrfToken });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
