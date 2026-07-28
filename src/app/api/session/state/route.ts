import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return NextResponse.json({ solved: [] });

    const payload = await verifyToken(token);
    if (!payload || !payload.sessionId) return NextResponse.json({ solved: [] });

    const solved = payload.solved || [];
    const responseData: any = { 
      solved,
      csrfToken: payload.csrfToken 
    };

    if (solved.length === 12) {
      responseData.coordinates = process.env.COORDINATES;
      responseData.completed = true;
    }

    return NextResponse.json(responseData);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
