import { NextRequest, NextResponse } from 'next/server';
import { revokeSession, SESSION_COOKIE_NAME } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
    const auth = request.headers.get('authorization') || '';
    const headerToken = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value || '';
    const token = headerToken || cookieToken;
    if (token) await revokeSession(token);

    const res = NextResponse.json({ success: true });
    res.cookies.set(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });
    return res;
}
