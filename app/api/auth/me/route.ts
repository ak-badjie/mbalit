import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';

/**
 * GET /api/auth/me
 * Returns the userId for the current session, or 401 if none. The client
 * uses this on mount to decide whether to subscribe to the user document.
 */
export async function GET(request: NextRequest) {
    const session = await getSessionUser(request);
    if (!session) {
        return NextResponse.json({ success: false }, { status: 401 });
    }
    return NextResponse.json({ success: true, uid: session.userId });
}
