import { NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const sessionId = crypto.randomUUID();
    const csrfToken = crypto.randomBytes(32).toString('hex');
    
    // Create JWT containing our stateless session data
    const token = await createToken({ 
      sessionId, 
      solved: {}, 
      csrfToken 
    });

    // Set Cookie
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 2 * 60 * 60, // 2 hours
      path: '/'
    });

    return NextResponse.json({ success: true, csrfToken });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
