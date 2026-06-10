/**
 * eBay API Client
 *
 * Covers:
 *   - OAuth2 Client Credentials flow (app token)
 *   - Browse API  → active listings with prices
 *   - Finding API → completed/sold listings (legacy but functional)
 *   - Notifications API → subscription management
 */

const EBAY_BASE = process.env.EBAY_ENVIRONMENT === 'SANDBOX'
  ? 'https://api.sandbox.ebay.com'
  : 'https://api.ebay.com';

// ─── OAuth token cache ────────────────────────────────────────────────────────
let _token: string | null = null;
let _tokenExpiry = 0;

export async function getEbayToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const clientId     = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are required');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${EBAY_BASE}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`eBay auth failed (${res.status}): ${txt}`);
  }

  const data = await res.json();
  _token = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in * 1000) - 60_000;
  return _token!;
}

// ─── Browse API — active listings ─────────────────────────────────────────────
export interface EbayListing {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  condition: string;
  imageUrl: string;
  itemWebUrl: string;
  categoryId: string;
  soldCount?: number;
}

export async function searchActiveListings(
  query: string,
  limit = 20,
  filterSold = false
): Promise<EbayListing[]> {
  const token = await getEbayToken();

  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    filter: [
      'buyingOptions:{FIXED_PRICE}',
      filterSold ? 'itemEndDate:[..now]' : '',
    ].filter(Boolean).join(','),
    sort: 'price',
  });

  const res = await fetch(`${EBAY_BASE}/buy/browse/v1/item_summary/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      'Content-Type': 'application/json',
    },
    next: { revalidate: 1800 },
  });

  if (!res.ok) throw new Error(`eBay Browse API ${res.status}`);
  const data = await res.json();

  return (data.itemSummaries ?? []).map((item: {
    itemId: string;
    title: string;
    price?: { value: string; currency: string };
    condition?: string;
    image?: { imageUrl: string };
    itemWebUrl: string;
    categories?: Array<{ categoryId: string }>;
  }) => ({
    itemId:    item.itemId,
    title:     item.title,
    price:     parseFloat(item.price?.value ?? '0'),
    currency:  item.price?.currency ?? 'USD',
    condition: item.condition ?? 'Unknown',
    imageUrl:  item.image?.imageUrl ?? '',
    itemWebUrl:item.itemWebUrl,
    categoryId:item.categories?.[0]?.categoryId ?? '',
  }));
}

// ─── Finding API — completed/sold listings ────────────────────────────────────
// This is the legacy XML API but it's the only free way to get sold prices
export interface SoldListing {
  itemId: string;
  title: string;
  soldPrice: number;
  currency: string;
  soldDate: string;
  condition: string;
}

export async function getSoldListings(
  query: string,
  daysBack = 30,
  limit = 50
): Promise<SoldListing[]> {
  const appId = process.env.EBAY_CLIENT_ID;
  if (!appId) throw new Error('EBAY_CLIENT_ID required');

  const endDate = new Date();
  const startDate = new Date(Date.now() - daysBack * 86400000);

  const params = new URLSearchParams({
    'OPERATION-NAME': 'findCompletedItems',
    'SERVICE-VERSION': '1.13.0',
    'SECURITY-APPNAME': appId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'keywords': query,
    'categoryId': '183454', // eBay Pokémon card category
    'itemFilter(0).name': 'SoldItemsOnly',
    'itemFilter(0).value': 'true',
    'itemFilter(1).name': 'EndTimeFrom',
    'itemFilter(1).value': startDate.toISOString(),
    'itemFilter(2).name': 'EndTimeTo',
    'itemFilter(2).value': endDate.toISOString(),
    'sortOrder': 'EndTimeSoonest',
    'paginationInput.entriesPerPage': String(Math.min(limit, 100)),
  });

  const res = await fetch(
    `https://svcs.ebay.com/services/search/FindingService/v1?${params}`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) throw new Error(`eBay Finding API ${res.status}`);
  const data = await res.json();

  const items = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item ?? [];

  return items.map((item: {
    itemId: string[];
    title: string[];
    sellingStatus?: Array<{ currentPrice?: Array<{ __value__: string; '@currencyId': string }> }>;
    listingInfo?: Array<{ endTime?: string[] }>;
    condition?: Array<{ conditionDisplayName?: string[] }>;
  }) => ({
    itemId:    item.itemId?.[0] ?? '',
    title:     item.title?.[0] ?? '',
    soldPrice: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ?? '0'),
    currency:  item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] ?? 'USD',
    soldDate:  item.listingInfo?.[0]?.endTime?.[0] ?? '',
    condition: item.condition?.[0]?.conditionDisplayName?.[0] ?? 'Unknown',
  }));
}

// ─── Aggregate signal data for the index ──────────────────────────────────────
export interface EbaySignalData {
  avgSoldPrice: number;
  priceVs30dAvg: number;       // % change
  sellThroughRate: number;     // 0-100 score
  tradingVolumeScore: number;  // 0-100 score
  totalSales: number;
  totalListings: number;
  live: boolean;
}

// Key Pokémon card search terms to track
const POKEMON_QUERIES = [
  'pokemon card illustration rare',
  'pokemon card special illustration rare',
  'pokemon card charizard holo',
  'pokemon card psa 10',
];

export async function getEbayMarketSignals(): Promise<EbaySignalData> {
  try {
    const [sold, active] = await Promise.all([
      getSoldListings('pokemon card illustration rare special', 30, 100),
      searchActiveListings('pokemon card illustration rare special', 50),
    ]);

    if (!sold.length) throw new Error('no sold data');

    // Average sold price
    const avgSold = sold.reduce((s, l) => s + l.soldPrice, 0) / sold.length;

    // 30-day vs 7-day trend (use first vs last thirds as proxy)
    const oldSales = sold.slice(-Math.floor(sold.length / 3));
    const newSales = sold.slice(0, Math.floor(sold.length / 3));
    const oldAvg = oldSales.length ? oldSales.reduce((s, l) => s + l.soldPrice, 0) / oldSales.length : avgSold;
    const newAvg = newSales.length ? newSales.reduce((s, l) => s + l.soldPrice, 0) / newSales.length : avgSold;
    const priceChange = oldAvg > 0 ? ((newAvg - oldAvg) / oldAvg) * 100 : 0;

    // Sell-through rate: sold / (sold + active)
    const str = sold.length / (sold.length + active.length);
    const strScore = Math.min(95, Math.max(5, str * 130)); // 77% STR → ~100 score

    // Volume score: how many sales vs baseline (50 sales/month = neutral)
    const volScore = Math.min(95, Math.max(5, (sold.length / 50) * 50));

    return {
      avgSoldPrice:      Math.round(avgSold * 100) / 100,
      priceVs30dAvg:     Math.round(priceChange * 10) / 10,
      sellThroughRate:   Math.round(strScore),
      tradingVolumeScore:Math.round(volScore),
      totalSales:        sold.length,
      totalListings:     active.length,
      live:              true,
    };
  } catch (err) {
    console.warn('[eBay] Signal fallback:', (err as Error).message);
    return {
      avgSoldPrice: 0,
      priceVs30dAvg: 0,
      sellThroughRate: 55,
      tradingVolumeScore: 50,
      totalSales: 0,
      totalListings: 0,
      live: false,
    };
  }
}

// ─── Notification subscription management ────────────────────────────────────
// Call this once to register your webhook with eBay
export async function subscribeToNotifications(endpointUrl: string): Promise<void> {
  const token = await getEbayToken();

  const topics = [
    { topicId: 'ITEM_SOLD' },
    { topicId: 'ITEM_LISTED' },
    { topicId: 'ITEM_PRICE_CHANGED' },
    { topicId: 'ITEM_ENDED' },
    { topicId: 'MARKETPLACE_ACCOUNT_DELETION' }, // required by eBay
  ];

  for (const topic of topics) {
    const res = await fetch(`${EBAY_BASE}/commerce/notification/v1/subscription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topicId: topic.topicId,
        deliveryConfig: {
          endpoint: endpointUrl,
          verificationToken: process.env.EBAY_VERIFICATION_TOKEN,
        },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error(`Failed to subscribe to ${topic.topicId}:`, txt);
    } else {
      console.log(`✓ Subscribed to ${topic.topicId}`);
    }
  }
}

// ─── List current subscriptions ───────────────────────────────────────────────
export async function listSubscriptions() {
  const token = await getEbayToken();
  const res = await fetch(`${EBAY_BASE}/commerce/notification/v1/subscription`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`List subscriptions ${res.status}`);
  return res.json();
}
