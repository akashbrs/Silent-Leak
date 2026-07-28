import { NextResponse } from 'next/server';
import { verifyToken, redis } from '@/lib/auth';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const answerHashes = [
  "d2ab4d66cc72237fb466ceef7591872ce5a3ce5feb8db1a85f10e92cf7cb3cf5",
  "b77e9e4073572a90f5783aa88e8094598952e43ea06bb1271e2710dc1977d9f0",
  "b11f144e03b1b81c5f2f8e185839b44d6ad21b82a397cf95ff143ed97039eced",
  "c8dd26c9fbcd17bb809c8289f7c5a8fe3b2e7bc21784f686a31c5ea9b24d0ec7",
  "7aba88876a13edbf9c6b8fb7c678ae6813852e6a1514998c59d2c49ba46c7d2a",
  "9edec532d31d066002e903a55f5780581e3c418c6e73d4bbf31510cbc609da25",
  "71c62aa56508ed49843745a0b838ab8233c4ecaaf26dbc7fde2fb80f454de99c",
  "acd73c1b669302c1ae36b07889cc2e4e2c37f261c8bfebefda467f726f1826d8",
  "9390298f3fb0c5b160498935d79cb139aef28e1c47358b4bbba61862b9c26e59",
  "305f61f88a5815ea20c9c67a6aa88dfda8c332dbd004b9bab1cba065e89c506d",
  "e9ef5a462dd94311faf9b926bcd0ba688669fe34ccadd9ccfeae535cf3f171b2",
  "d2eb412715c6b4f265ef92e35d16d071a03df49664c8a5e7adb58c0e073fda4d"
];

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const sessionId = payload.sessionId as string;

    // Rate Limiting (10 requests per 10 seconds per session)
    const rateLimitKey = `rate:${sessionId}`;
    const requests = await redis.incr(rateLimitKey);
    if (requests === 1) await redis.expire(rateLimitKey, 10);
    if (requests > 10) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });

    const body = await req.json();
    const { questionIndex, answer, csrfToken } = body;

    // CSRF Protection
    const storedCsrf = await redis.get(`csrf:${sessionId}`);
    if (!storedCsrf || storedCsrf !== csrfToken) {
      return NextResponse.json({ error: 'Invalid CSRF Token' }, { status: 403 });
    }

    if (typeof questionIndex !== 'number' || questionIndex < 0 || questionIndex >= answerHashes.length) {
      return NextResponse.json({ error: 'Invalid Input' }, { status: 400 });
    }

    const trimmedAnswer = typeof answer === 'string' ? answer.trim() : "";
    const flagMatch = trimmedAnswer.match(/^BSCTF\{(.*)\}$/i);
    if (!flagMatch) {
      return NextResponse.json({ success: false, error: 'Invalid flag format' });
    }

    const extractedAnswer = flagMatch[1].trim().toLowerCase();
    const hashedInput = crypto.createHash('sha256').update(extractedAnswer).digest('hex');

    if (hashedInput === answerHashes[questionIndex]) {
      const sessionKey = `session:${sessionId}`;
      const solvedRaw = await redis.get(sessionKey);
      if (!solvedRaw) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

      let solved = JSON.parse(solvedRaw);
      if (!solved.includes(questionIndex.toString())) {
        solved.push(questionIndex.toString());
        await redis.setex(sessionKey, 7200, JSON.stringify(solved));
      }

      if (solved.length === 12) {
        return NextResponse.json({ 
          success: true, 
          completed: true, 
          coordinates: process.env.COORDINATES 
        });
      }

      return NextResponse.json({ success: true, solved });
    }

    return NextResponse.json({ success: false });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
