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

// ─── Top Movers from eBay sold listings ───────────────────────────────────────
export interface EbayMover {
  id: string;
  name: string;
  set: string;
  condition: string;
  imageUrl: string;
  itemWebUrl: string;
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  volume: number;
  spark: number[];
  category: string;
  live: boolean;
}

const MOVER_QUERIES = [
  'pokemon card illustration rare psa',
  'pokemon card special illustration rare',
  'pokemon card charizard holo psa 10',
  'pokemon card vintage base set holo',
  'pokemon card hyper rare',
  'pokemon booster box sealed',
];

function cleanTitle(title: string): string {
  return title
    .replace(/\b(PSA|BGS|CGC)\s*\d+(\.\d+)?\b/gi, '')
    .replace(/\b(graded|mint|nm|pack fresh|raw|sealed|booster|box|lot|bundle)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

function extractSet(title: string): string {
  const sets = [
    'Obsidian Flames', 'Paradox Rift', 'Paldea Evolved', 'Scarlet & Violet',
    '151', 'Crown Zenith', 'Silver Tempest', 'Lost Origin', 'Astral Radiance',
    'Brilliant Stars', 'Fusion Strike', 'Evolving Skies', 'Chilling Reign',
    'Battle Styles', 'Shining Fates', 'Base Set', 'Jungle', 'Fossil',
    'Team Rocket', 'Gym Heroes', 'Neo Genesis', 'Temporal Forces',
    'Twilight Masquerade', 'Shrouded Fable', 'Stellar Crown',
  ];
  for (const set of sets) {
    if (title.toLowerCase().includes(set.toLowerCase())) return set;
  }
  return 'Pokémon TCG';
}

interface GroupedCard {
  title: string;
  sales: Array<{ price: number; date: Date; imageUrl: string; itemWebUrl: string; condition: string }>;
}

export async function getEbayMovers(): Promise<{ gainers: EbayMover[]; losers: EbayMover[]; live: boolean }> {
  try {
    const appId = process.env.EBAY_CLIENT_ID;
    if (!appId) throw new Error('EBAY_CLIENT_ID required');

    const now = new Date();
    const ago24h = new Date(now.getTime() -  1 * 86400000);
    const ago7d  = new Date(now.getTime() -  7 * 86400000);
    const ago30d = new Date(now.getTime() - 30 * 86400000);

    // Fetch sold listings for each query in parallel
    const results = await Promise.allSettled(
      MOVER_QUERIES.map(q => getSoldListings(q, 30, 100))
    );

    const allSold: SoldListing[] = results
      .filter((r): r is PromiseFulfilledResult<SoldListing[]> => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .filter(s => s.soldPrice > 5);

    if (allSold.length < 5) throw new Error('insufficient sold data');

    // Fetch active listings for images and URLs
    const activeResults = await Promise.allSettled(
      MOVER_QUERIES.slice(0, 3).map(q => searchActiveListings(q, 20))
    );
    const activeListings: EbayListing[] = activeResults
      .filter((r): r is PromiseFulfilledResult<EbayListing[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // Build image/URL lookup from active listings
    const imageMap = new Map<string, { imageUrl: string; itemWebUrl: string }>();
    for (const listing of activeListings) {
      const key = cleanTitle(listing.title).toLowerCase().slice(0, 20);
      if (!imageMap.has(key) && listing.imageUrl) {
        imageMap.set(key, { imageUrl: listing.imageUrl, itemWebUrl: listing.itemWebUrl });
      }
    }

    // Group sales by cleaned card name
    const groups = new Map<string, GroupedCard>();
    for (const sale of allSold) {
      const key = cleanTitle(sale.title).toLowerCase().slice(0, 30);
      if (!groups.has(key)) {
        groups.set(key, { title: cleanTitle(sale.title), sales: [] });
      }
      groups.get(key)!.sales.push({
        price:      sale.soldPrice,
        date:       new Date(sale.soldDate),
        imageUrl:   '',
        itemWebUrl: '',
        condition:  sale.condition,
      });
    }

    // Calculate price changes per group
    const movers: EbayMover[] = [];

    for (const [key, group] of groups) {
      if (group.sales.length < 2) continue;

      const sorted = [...group.sales].sort((a, b) => b.date.getTime() - a.date.getTime());
      const avg = (sales: typeof sorted) =>
        sales.length ? sales.reduce((s, x) => s + x.price, 0) / sales.length : 0;

      const recent7d  = sorted.filter(s => s.date >= ago7d);
      const older7d   = sorted.filter(s => s.date < ago24h && s.date >= ago7d);
      const older30d  = sorted.filter(s => s.date < ago7d  && s.date >= ago30d);

      const currentPrice = avg(recent7d.length ? recent7d : sorted.slice(0, 3));
      if (currentPrice === 0) continue;

      const avg24hBase = avg(older7d.length ? older7d : sorted.slice(3, 6));
      const avg7dBase  = avg(older30d.length ? older30d : sorted.slice(Math.floor(sorted.length / 2)));
      const avg30dBase = avg(sorted.slice(-Math.ceil(sorted.length / 3)));

      const pct = (curr: number, base: number) =>
        base > 0 ? Math.round(((curr - base) / base) * 1000) / 10 : 0;

      // Build 7-day sparkline
      const spark: number[] = [];
      for (let day = 6; day >= 0; day--) {
        const dayStart = new Date(now.getTime() - day * 86400000);
        const dayEnd   = new Date(now.getTime() - (day - 1) * 86400000);
        const daySales = sorted.filter(s => s.date >= dayStart && s.date < dayEnd);
        spark.push(daySales.length ? Math.round(avg(daySales) * 100) / 100 : currentPrice);
      }

      const imgKey = key.slice(0, 20);
      const imgData = imageMap.get(imgKey) ?? { imageUrl: '', itemWebUrl: '' };

      movers.push({
        id:         key,
        name:       group.title,
        set:        extractSet(group.title),
        condition:  sorted[0].condition,
        imageUrl:   imgData.imageUrl,
        itemWebUrl: imgData.itemWebUrl,
        price:      Math.round(currentPrice * 100) / 100,
        change24h:  pct(currentPrice, avg24hBase),
        change7d:   pct(currentPrice, avg7dBase),
        change30d:  pct(currentPrice, avg30dBase),
        volume:     sorted.filter(s => s.date >= ago30d).length,
        spark,
        category:   group.title.toLowerCase().includes('sealed') || group.title.toLowerCase().includes('box') ? 'Sealed' : 'Singles',
        live:       true,
      });
    }

    const sortedMovers = [...movers].sort((a, b) => b.change30d - a.change30d);
    console.log(`[eBay Movers] ${movers.length} cards tracked`);

    return {
      gainers: sortedMovers.slice(0, 10),
      losers:  [...sortedMovers].reverse().slice(0, 10),
      live:    true,
    };
  } catch (err) {
    console.warn('[eBay Movers] Fallback:', (err as Error).message);
    return { gainers: [], losers: [], live: false };
  }
}
