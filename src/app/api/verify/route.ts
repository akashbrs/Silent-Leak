import { NextResponse } from 'next/server';
import { verifyToken, createToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const answerHashes = [
  "b1761def013596b9f24e10711f085d8da5168b0b57a122ccfbc75ca3caa6b84e",
  "f728dc69f47fd5c6a8bbcbb0e1fdef7a41fe71cd7242552442ca9333a53c92ae",
  "447db96317fc00c093303f6ca372ae23565dd7ec686e688ad14b9959c8fe624e",
  "7d99771be751d1906667bb3d59073ff10f508702238c70a0015c5b50da23b396",
  "4684d991b437dbd79124e8f858150d957863ea35dce43484caf7dd699dd79e37",
  "d8ea3c214c66ae5d7a167c77a97c532193e61855b6233860952ad8c3f7aa996b",
  "b85913b0e6912b08f3a41966794769010f2197ab087cd8130fe6d46ad3daa1a8",
  "a47fbe382960eb77a87d87fc639ef6a0466b1ff910be3eee54ff7cac5a1e3076",
  "9390298f3fb0c5b160498935d79cb139aef28e1c47358b4bbba61862b9c26e59",
  "305f61f88a5815ea20c9c67a6aa88dfda8c332dbd004b9bab1cba065e89c506d",
  "e9ef5a462dd94311faf9b926bcd0ba688669fe34ccadd9ccfeae535cf3f171b2",
  "d2ab4d66cc72237fb466ceef7591872ce5a3ce5feb8db1a85f10e92cf7cb3cf5"
];

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { questionIndex, answer, csrfToken } = body;

    // CSRF Protection
    if (!payload.csrfToken || payload.csrfToken !== csrfToken) {
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

    console.log("--- DEBUG VERIFY ---");
    console.log("Raw Answer:", answer);
    console.log("Extracted:", extractedAnswer);
    console.log("Hashed Input:", hashedInput);
    console.log("Expected Hash:", answerHashes[questionIndex]);
    console.log("Match?", hashedInput === answerHashes[questionIndex]);

    if (hashedInput === answerHashes[questionIndex]) {
      let solved: string[] = Array.isArray(payload.solved) ? payload.solved : [];
      
      if (!solved.includes(questionIndex.toString())) {
        solved = [...solved, questionIndex.toString()];
        
        // Issue updated stateless token (omit iat/exp from old payload to avoid jose strict errors)
        const newToken = await createToken({ 
          sessionId: payload.sessionId,
          csrfToken: payload.csrfToken,
          solved 
        });
        
        cookieStore.set('session', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 2 * 60 * 60,
          path: '/'
        });
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
  } catch (error: any) {
    console.error("DEBUG ERROR:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
