import { NextResponse } from 'next/server';
import { verifyToken, redis } from '@/lib/auth';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return NextResponse.json({ solved: [] });

    const payload = await verifyToken(token);
    if (!payload || !payload.sessionId) return NextResponse.json({ solved: [] });
    const sessionId = payload.sessionId as string;

    const solvedRaw = await redis.get(`session:${sessionId}`);
    if (!solvedRaw) return NextResponse.json({ solved: [] });

    const solved = JSON.parse(solvedRaw);
    const responseData: any = { solved };

    if (solved.length === 12) {
      responseData.coordinates = process.env.COORDINATES;
      responseData.completed = true;
    }

    // Generate fresh CSRF for the active session
    const csrfToken = crypto.randomBytes(32).toString('hex');
    await redis.setex(`csrf:${sessionId}`, 7200, csrfToken);
    responseData.csrfToken = csrfToken;

    return NextResponse.json(responseData);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
