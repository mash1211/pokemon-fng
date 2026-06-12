import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // Check env vars
  const appId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  results.env = {
    EBAY_CLIENT_ID:     appId ? `${appId.slice(0, 10)}...` : 'MISSING',
    EBAY_CLIENT_SECRET: clientSecret ? 'present' : 'MISSING',
    EBAY_ENVIRONMENT:   process.env.EBAY_ENVIRONMENT ?? 'MISSING',
    POKETCG_API_KEY:    process.env.POKETCG_API_KEY ? 'present' : 'MISSING',
    YOUTUBE_API_KEY:    process.env.YOUTUBE_API_KEY ? 'present' : 'MISSING',
    SERPAPI_KEY:        process.env.SERPAPI_KEY ? 'present' : 'MISSING',
    REDDIT_CLIENT_ID:   process.env.REDDIT_CLIENT_ID ? 'present' : 'MISSING',
  };

  if (!appId) {
    return NextResponse.json({ error: 'EBAY_CLIENT_ID missing', results });
  }

  // Test 1: Raw Finding API call — no wrapper, see exact response
  try {
    const params = new URLSearchParams({
      'OPERATION-NAME': 'findCompletedItems',
      'SERVICE-VERSION': '1.13.0',
      'SECURITY-APPNAME': appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'keywords': 'pokemon card charizard',
      'categoryId': '183454',
      'itemFilter(0).name': 'SoldItemsOnly',
      'itemFilter(0).value': 'true',
      'sortOrder': 'EndTimeSoonest',
      'paginationInput.entriesPerPage': '5',
    });

    const res = await fetch(
      `https://svcs.ebay.com/services/search/FindingService/v1?${params}`
    );

    const data = await res.json();
    const ack = data?.findCompletedItemsResponse?.[0]?.ack?.[0];
    const errMsg = data?.findCompletedItemsResponse?.[0]?.errorMessage?.[0]?.error?.[0]?.message?.[0];
    const items = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item ?? [];

    results.findingApi = {
      httpStatus: res.status,
      ack,
      error: errMsg ?? null,
      itemCount: items.length,
      sample: items.slice(0, 2).map((item: {title: string[]; sellingStatus: Array<{currentPrice: Array<{__value__: string}>}>}) => ({
        title: item.title?.[0]?.slice(0, 60),
        price: item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__,
      })),
    };
  } catch (err) {
    results.findingApi = { error: (err as Error).message };
  }

  // Test 2: OAuth token for Browse API
  try {
    const credentials = Buffer.from(`${appId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    });
    const tokenData = await tokenRes.json();
    results.oauthToken = {
      httpStatus: tokenRes.status,
      success: !!tokenData.access_token,
      error: tokenData.error_description ?? null,
      tokenPreview: tokenData.access_token ? tokenData.access_token.slice(0, 20) + '...' : null,
    };
  } catch (err) {
    results.oauthToken = { error: (err as Error).message };
  }

  // Test 3: PokéTCG API
  try {
    const headers: Record<string, string> = {};
    if (process.env.POKETCG_API_KEY) headers['X-Api-Key'] = process.env.POKETCG_API_KEY;
    const r = await fetch('https://api.pokemontcg.io/v2/cards?pageSize=1&select=id,name', { headers });
    results.pokeTcg = { httpStatus: r.status, success: r.ok };
  } catch (err) {
    results.pokeTcg = { error: (err as Error).message };
  }

  return NextResponse.json(results, { status: 200 });
}
