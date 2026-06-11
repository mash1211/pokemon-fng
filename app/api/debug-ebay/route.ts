import { NextRequest, NextResponse } from 'next/server';
import { getEbayToken, getSoldListings, searchActiveListings } from '@/app/lib/ebay';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // Test OAuth token
  try {
    const token = await getEbayToken();
    results.auth = { success: true, tokenPreview: token.slice(0, 20) + '...' };
  } catch (err) {
    results.auth = { success: false, error: (err as Error).message };
    return NextResponse.json({ step: 'auth_failed', results });
  }

  // Test Finding API (sold listings)
  try {
    const sold = await getSoldListings('pokemon card charizard', 30, 10);
    results.findingApi = {
      success: true,
      count: sold.length,
      sample: sold.slice(0, 3).map(s => ({
        title: s.title.slice(0, 50),
        price: s.soldPrice,
        date:  s.soldDate,
      })),
    };
  } catch (err) {
    results.findingApi = { success: false, error: (err as Error).message };
  }

  // Test Browse API (active listings)
  try {
    const active = await searchActiveListings('pokemon card illustration rare', 5);
    results.browseApi = {
      success: true,
      count: active.length,
      sample: active.slice(0, 3).map(l => ({
        title:    l.title.slice(0, 50),
        price:    l.price,
        imageUrl: l.imageUrl ? 'present' : 'missing',
      })),
    };
  } catch (err) {
    results.browseApi = { success: false, error: (err as Error).message };
  }

  // Check env vars
  results.env = {
    EBAY_CLIENT_ID:     process.env.EBAY_CLIENT_ID ? `${process.env.EBAY_CLIENT_ID.slice(0, 8)}...` : 'MISSING',
    EBAY_CLIENT_SECRET: process.env.EBAY_CLIENT_SECRET ? 'present' : 'MISSING',
    EBAY_ENVIRONMENT:   process.env.EBAY_ENVIRONMENT ?? 'MISSING',
  };

  return NextResponse.json(results);
}
