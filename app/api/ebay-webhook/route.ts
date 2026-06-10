import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// ─── eBay Notification Types we care about ────────────────────────────────────
const RELEVANT_TOPICS = new Set([
  'MARKETPLACE_ACCOUNT_DELETION',  // required by eBay policy
  'ITEM_SOLD',
  'ITEM_LISTED',
  'ITEM_REVISED',
  'ITEM_ENDED',
  'ITEM_PRICE_CHANGED',
]);

// ─── Verify eBay's challenge request (required for endpoint validation) ────────
// eBay sends a GET with ?challenge_code=xxx to verify your endpoint exists
export async function GET(req: NextRequest) {
  const challengeCode = req.nextUrl.searchParams.get('challenge_code');
  if (!challengeCode) {
    return NextResponse.json({ error: 'No challenge code' }, { status: 400 });
  }

  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN ?? '';
  const endpoint = `${req.nextUrl.origin}/api/ebay-webhook`;

  // eBay requires: SHA-256(challengeCode + verificationToken + endpoint)
  const hash = crypto
    .createHash('sha256')
    .update(challengeCode + verificationToken + endpoint)
    .digest('hex');

  return NextResponse.json({ challengeResponse: hash });
}

// ─── Receive notification events ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    // Verify the request signature header
    const signature = req.headers.get('x-ebay-signature');
    if (!verifySignature(body, signature)) {
      console.warn('[eBay Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const topic: string = event.metadata?.topic ?? '';

    console.log(`[eBay Webhook] Received: ${topic}`);

    if (!RELEVANT_TOPICS.has(topic)) {
      return NextResponse.json({ status: 'ignored' });
    }

    // Route to the appropriate handler
    switch (topic) {
      case 'ITEM_SOLD':
        await handleItemSold(event);
        break;
      case 'ITEM_LISTED':
        await handleItemListed(event);
        break;
      case 'ITEM_PRICE_CHANGED':
        await handlePriceChanged(event);
        break;
      case 'ITEM_ENDED':
        await handleItemEnded(event);
        break;
      case 'MARKETPLACE_ACCOUNT_DELETION':
        // Required by eBay policy — acknowledge and log
        console.log('[eBay] Account deletion request received');
        break;
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('[eBay Webhook] Error:', err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

// ─── Signature verification ───────────────────────────────────────────────────
function verifySignature(body: string, signature: string | null): boolean {
  // In sandbox/dev, skip verification
  if (process.env.EBAY_ENVIRONMENT === 'SANDBOX') return true;
  if (!signature) return false;

  const secret = process.env.EBAY_CLIENT_SECRET ?? '';
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// ─── Event handlers ───────────────────────────────────────────────────────────

interface EbayEvent {
  metadata: { topic: string; eventDate: string };
  notification: {
    data: {
      item?: {
        itemId: string;
        title: string;
        price?: { value: string; currency: string };
        categoryId?: string;
      };
      transaction?: {
        transactionId: string;
        finalValueFee?: { value: string };
        buyer?: { username: string };
      };
    };
  };
}

async function handleItemSold(event: EbayEvent) {
  const item = event.notification?.data?.item;
  const tx   = event.notification?.data?.transaction;
  if (!item) return;

  const saleData = {
    itemId:    item.itemId,
    title:     item.title,
    price:     parseFloat(item.price?.value ?? '0'),
    currency:  item.price?.currency ?? 'USD',
    soldAt:    event.metadata.eventDate,
    txId:      tx?.transactionId,
    category:  item.categoryId,
  };

  console.log('[eBay Sold]', saleData);

  // TODO: persist to your database (Vercel KV, Supabase, Postgres etc.)
  // e.g. await kv.lpush('ebay:sales', JSON.stringify(saleData));
  //      await kv.ltrim('ebay:sales', 0, 999); // keep last 1000

  // TODO: trigger sentiment recalculation if significant sale
  // e.g. if (saleData.price > 100) await recomputeIndex();
}

async function handleItemListed(event: EbayEvent) {
  const item = event.notification?.data?.item;
  if (!item) return;

  console.log('[eBay Listed]', {
    itemId: item.itemId,
    title:  item.title,
    price:  item.price?.value,
    listedAt: event.metadata.eventDate,
  });

  // TODO: track new listing volume for Trading Volume signal
  // High listing velocity = bearish supply signal
}

async function handlePriceChanged(event: EbayEvent) {
  const item = event.notification?.data?.item;
  if (!item) return;

  console.log('[eBay Price Change]', {
    itemId:   item.itemId,
    title:    item.title,
    newPrice: item.price?.value,
    changedAt: event.metadata.eventDate,
  });

  // TODO: feed into Volatility signal
}

async function handleItemEnded(event: EbayEvent) {
  const item = event.notification?.data?.item;
  if (!item) return;

  console.log('[eBay Item Ended]', {
    itemId:  item.itemId,
    title:   item.title,
    endedAt: event.metadata.eventDate,
  });

  // TODO: use unsold items to calculate Sell-Through Rate
  // sellThrough = sold / (sold + unsold)
}
