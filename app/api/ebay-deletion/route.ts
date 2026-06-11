import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * eBay Marketplace Account Deletion endpoint. 
 *
 * eBay REQUIRES this endpoint for all apps using their API.
 * It must:
 *   1. Respond to GET with a challenge hash (endpoint validation)
 *   2. Respond to POST by acknowledging account deletion notifications
 *
 * Set this URL in eBay Developer Portal:
 *   Alerts & Notifications → Marketplace Account Deletion
 *   Endpoint: https://pokemon-fngv2.vercel.app/api/ebay-deletion
 *   Verification Token: must match EBAY_VERIFICATION_TOKEN in your env vars
 */

// ─── GET: eBay challenge verification ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const challengeCode = req.nextUrl.searchParams.get('challenge_code');

  if (!challengeCode) {
    return NextResponse.json({ error: 'Missing challenge_code' }, { status: 400 });
  }

  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN ?? '';
  const endpoint = `${req.nextUrl.origin}/api/ebay-deletion`;

  // eBay requires SHA-256(challengeCode + verificationToken + endpoint)
  const hash = crypto
    .createHash('sha256')
    .update(challengeCode + verificationToken + endpoint)
    .digest('hex');

  console.log('[eBay Deletion] Challenge verified for endpoint:', endpoint);

  return NextResponse.json({ challengeResponse: hash });
}

// ─── POST: receive account deletion notifications ─────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userId = body?.notification?.data?.userId
      ?? body?.data?.userId
      ?? 'unknown';

    console.log('[eBay Deletion] Account deletion notification received for user:', userId);

    // In a real app with user data: delete any stored data for this userId.
    // PokéSentiment doesn't store eBay user data, so we just acknowledge.

    return NextResponse.json({ acknowledged: true });
  } catch (err) {
    console.error('[eBay Deletion] Error:', err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
