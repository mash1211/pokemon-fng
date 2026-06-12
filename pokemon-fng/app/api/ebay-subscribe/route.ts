import { NextRequest, NextResponse } from 'next/server';
import { subscribeToNotifications, listSubscriptions } from '@/app/lib/ebay';

// Protect with a secret so only you can trigger it
// Call once after deploying: GET /api/ebay-subscribe?secret=YOUR_ADMIN_SECRET
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const action = req.nextUrl.searchParams.get('action') ?? 'subscribe';

  try {
    if (action === 'list') {
      const subs = await listSubscriptions();
      return NextResponse.json(subs);
    }

    // Build the webhook URL from the request origin
    const webhookUrl = `${req.nextUrl.origin}/api/ebay-webhook`;
    console.log('Registering eBay webhook at:', webhookUrl);

    await subscribeToNotifications(webhookUrl);

    return NextResponse.json({
      success: true,
      message: 'Subscribed to eBay notifications',
      webhookUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
