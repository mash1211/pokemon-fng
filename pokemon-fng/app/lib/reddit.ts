/**
 * Reddit API client for the Social Buzz signal.
 *
 * Uses the OAuth2 "script" app flow (no user login required).
 * Falls back gracefully to a heuristic if credentials aren't set.
 *
 * Setup:
 *   1. Go to https://www.reddit.com/prefs/apps and create a "script" app.
 *   2. Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME,
 *      REDDIT_PASSWORD in your .env.local / Vercel env vars.
 */

const REDDIT_UA = 'PokeSentiment/1.0 (by /u/pokésentiment-bot)';

// Subreddits to monitor for Pokémon TCG sentiment
const TCG_SUBS = [
  'PokemonTCG',
  'pokemon',
  'pkmntcg',
  'PokemonCardValue',
];

// Keywords that skew sentiment toward greed
const GREED_KEYWORDS = [
  'pulled', 'hit', 'hyped', 'moon', 'value', 'invest', 'buy', 'chase',
  'amazing pull', 'holy grail', '10/10', 'lfg', 'profit', 'flip', 'sold out',
  'secret rare', 'illustration rare', 'gold', 'alt art',
];

// Keywords that skew sentiment toward fear
const FEAR_KEYWORDS = [
  'crash', 'overpriced', 'reprint', 'sell', 'dumping', 'bubble', 'scam',
  'fake', 'avoid', 'disappointed', 'waste', 'tanked', 'plummeted', 'wary',
  'not worth', 'skip', 'oversaturated', 'saturated',
];

interface RedditPost {
  title: string;
  score: number;
  num_comments: number;
  upvote_ratio: number;
  created_utc: number;
  url: string;
  selftext: string;
}

interface SocialBuzzResult {
  score: number;        // 0–100
  detail: string;
  postCount: number;
  avgUpvoteRatio: number;
  sentimentBreakdown: { greed: number; fear: number; neutral: number };
  topPosts: { title: string; score: number; url: string }[];
  live: boolean;        // true = from Reddit API, false = heuristic
}

// ─── Reddit OAuth token (cached in module scope, reset per cold start) ─────────
let _token: string | null = null;
let _tokenExpiry = 0;

async function getRedditToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  const user = process.env.REDDIT_USERNAME;
  const pass = process.env.REDDIT_PASSWORD;

  if (!id || !secret || !user || !pass) {
    throw new Error('Reddit credentials not configured');
  }

  const body = new URLSearchParams({
    grant_type: 'password',
    username: user,
    password: pass,
  });

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': REDDIT_UA,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Reddit auth failed (${res.status}): ${txt}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(`Reddit auth error: ${data.error}`);

  _token = data.access_token as string;
  _tokenExpiry = Date.now() + (data.expires_in as number) * 1000 - 60_000;
  return _token;
}

async function fetchSubredditPosts(sub: string, token: string, limit = 25): Promise<RedditPost[]> {
  const res = await fetch(
    `https://oauth.reddit.com/r/${sub}/hot.json?limit=${limit}&t=day`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': REDDIT_UA,
      },
      next: { revalidate: 1800 }, // 30 min cache
    }
  );

  if (!res.ok) throw new Error(`Reddit fetch failed for r/${sub}: ${res.status}`);
  const json = await res.json();
  return (json.data?.children ?? []).map((c: { data: RedditPost }) => c.data);
}

function scoreSentiment(text: string): 'greed' | 'fear' | 'neutral' {
  const lower = text.toLowerCase();
  const greedHits = GREED_KEYWORDS.filter(k => lower.includes(k)).length;
  const fearHits = FEAR_KEYWORDS.filter(k => lower.includes(k)).length;
  if (greedHits === fearHits) return 'neutral';
  return greedHits > fearHits ? 'greed' : 'fear';
}

// Engagement velocity: posts with high engagement in a short window = greed signal
function engagementVelocity(posts: RedditPost[]): number {
  if (!posts.length) return 50;
  const now = Date.now() / 1000;
  const recent = posts.filter(p => now - p.created_utc < 6 * 3600); // last 6h
  const avgScore = recent.reduce((a, p) => a + p.score, 0) / Math.max(1, recent.length);
  const avgComments = recent.reduce((a, p) => a + p.num_comments, 0) / Math.max(1, recent.length);
  // Heuristic: 500 avg score + 50 avg comments → full greed
  return Math.min(100, (avgScore / 5) + (avgComments / 0.5));
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function getRedditSocialBuzz(): Promise<SocialBuzzResult> {
  try {
    const token = await getRedditToken();

    // Fetch from all subs in parallel
    const results = await Promise.allSettled(
      TCG_SUBS.map(sub => fetchSubredditPosts(sub, token, 25))
    );

    const allPosts: RedditPost[] = results
      .filter((r): r is PromiseFulfilledResult<RedditPost[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    if (!allPosts.length) throw new Error('No posts fetched');

    // Sentiment analysis
    const breakdown = { greed: 0, fear: 0, neutral: 0 };
    const weightedSentiment: number[] = [];

    for (const post of allPosts) {
      const text = `${post.title} ${post.selftext}`;
      const sentiment = scoreSentiment(text);
      breakdown[sentiment]++;

      // Weight by engagement (upvotes × ratio)
      const weight = Math.log1p(post.score * post.upvote_ratio + 1);
      const sentimentScore = sentiment === 'greed' ? 75 : sentiment === 'fear' ? 25 : 50;
      weightedSentiment.push(sentimentScore * weight);
    }

    const totalWeight = allPosts.reduce((a, p) => a + Math.log1p(p.score * p.upvote_ratio + 1), 0);
    const sentimentScore = totalWeight > 0
      ? weightedSentiment.reduce((a, b) => a + b, 0) / totalWeight
      : 50;

    const velocity = engagementVelocity(allPosts);
    const avgUpvoteRatio = allPosts.reduce((a, p) => a + p.upvote_ratio, 0) / allPosts.length;

    // Final score: blend sentiment (60%) + velocity (40%)
    const score = Math.round(sentimentScore * 0.6 + velocity * 0.4);

    const greedPct = Math.round((breakdown.greed / allPosts.length) * 100);
    const fearPct = Math.round((breakdown.fear / allPosts.length) * 100);

    const topPosts = [...allPosts]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(p => ({ title: p.title, score: p.score, url: `https://reddit.com${p.url}` }));

    const direction = score > 60 ? 'bullish' : score < 40 ? 'bearish' : 'mixed';
    const detail = `${allPosts.length} posts across r/PokemonTCG & friends — ${greedPct}% greed signals, ${fearPct}% fear signals. Community tone is ${direction}.`;

    return {
      score: Math.max(0, Math.min(100, score)),
      detail,
      postCount: allPosts.length,
      avgUpvoteRatio: Math.round(avgUpvoteRatio * 100),
      sentimentBreakdown: breakdown,
      topPosts,
      live: true,
    };
  } catch (err) {
    console.warn('[Reddit] Falling back to heuristic:', (err as Error).message);
    return heuristicFallback();
  }
}

function heuristicFallback(): SocialBuzzResult {
  const hour = new Date().getUTCHours();
  const day = new Date().getUTCDay();
  const isWeekend = day === 0 || day === 6;
  const isPeakHour = hour >= 17 && hour <= 23;
  const base = isWeekend ? 58 : 44;
  const boost = isPeakHour ? 10 : 0;
  const score = Math.min(90, base + boost + Math.random() * 8);

  return {
    score: Math.round(score),
    detail: `Heuristic estimate — add Reddit API keys for live data. ${isWeekend ? 'Weekend' : 'Weekday'} ${isPeakHour ? 'peak-hour' : 'baseline'} engagement pattern.`,
    postCount: 0,
    avgUpvoteRatio: 0,
    sentimentBreakdown: { greed: 0, fear: 0, neutral: 0 },
    topPosts: [],
    live: false,
  };
}
