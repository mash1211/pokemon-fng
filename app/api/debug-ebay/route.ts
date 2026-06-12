import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  const appId     = process.env.EBAY_CLIENT_ID;
  const appSecret = process.env.EBAY_CLIENT_SECRET;

  results.env = {
    EBAY_CLIENT_ID:     appId     ? `${appId.slice(0, 12)}...`    : 'MISSING',
    EBAY_CLIENT_SECRET: appSecret ? 'present'                      : 'MISSING',
    EBAY_ENVIRONMENT:   process.env.EBAY_ENVIRONMENT               ?? 'MISSING',
    POKETCG_API_KEY:    process.env.POKETCG_API_KEY   ? 'present'  : 'MISSING',
    YOUTUBE_API_KEY:    process.env.YOUTUBE_API_KEY   ? 'present'  : 'MISSING',
    SERPAPI_KEY:        process.env.SERPAPI_KEY        ? 'present'  : 'MISSING',
    REDDIT_CLIENT_ID:   process.env.REDDIT_CLIENT_ID  ? 'present'  : 'MISSING',
  };

  if (!appId || !appSecret) {
    return NextResponse.json({ error: 'eBay credentials missing', results });
  }

  // Step 1: Get OAuth token
  let token: string | null = null;
  try {
    const credentials = Buffer.from(`${appId}:${appSecret}`).toString('base64');
    const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    });
    const tokenData = await tokenRes.json();
    token = tokenData.access_token ?? null;
    results.oauthToken = {
      success: !!token,
      httpStatus: tokenRes.status,
      error: tokenData.error_description ?? null,
    };
  } catch (err) {
    results.oauthToken = { error: (err as Error).message };
    return NextResponse.json(results);
  }

  // Step 2: Test Browse API search
  try {
    const params = new URLSearchParams({
      q: 'pokemon card charizard illustration rare',
      limit: '5',
      category_ids: '183454',
    });
    const browseRes = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
      }
    );
    const browseData = await browseRes.json();
    const items = browseData.itemSummaries ?? [];
    results.browseApi = {
      httpStatus: browseRes.status,
      success: browseRes.ok,
      itemCount: items.length,
      error: browseData.errors?.[0]?.message ?? null,
      sample: items.slice(0, 3).map((i: {title:string; price?:{value:string}; image?:{imageUrl:string}}) => ({
        title:    i.title?.slice(0, 60),
        price:    i.price?.value,
        hasImage: !!i.image?.imageUrl,
      })),
    };
  } catch (err) {
    results.browseApi = { error: (err as Error).message };
  }

  // Step 3: Test PokéTCG
  try {
    const h: Record<string,string> = {};
    if (process.env.POKETCG_API_KEY) h['X-Api-Key'] = process.env.POKETCG_API_KEY;
    const r = await fetch('https://api.pokemontcg.io/v2/cards?pageSize=1&select=id,name', { headers: h });
    results.pokeTcg = { httpStatus: r.status, success: r.ok };
  } catch (err) {
    results.pokeTcg = { error: (err as Error).message };
  }

  return NextResponse.json(results);
}
