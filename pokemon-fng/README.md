# PokéSentiment — Pokémon TCG Fear & Greed Index

A real-time sentiment index for the Pokémon Trading Card Game market.
Inspired by the [Crypto Fear & Greed Index](https://alternative.me/crypto/fear-and-greed-index/).
Built with **Next.js 15 App Router**, deployable to Vercel in one click.

---

## Features

- **Animated gauge** with smooth needle + score count-up
- **6 independent signals** — each with live/heuristic indicator
- **Real Reddit API integration** — live sentiment from r/PokemonTCG and related communities
- **Trending Reddit posts** — top 3 posts displayed when live data is active
- **Live PokéTCG price data** — top premium card movers with 30d trend
- **30-day history chart** — visual sentiment timeline
- **Fully mobile responsive** — works on all screen sizes
- **Auto-refresh** every 30 minutes, sticky header with manual refresh
- **Graceful fallbacks** — every signal degrades to a heuristic if its API is down

---

## Signal Breakdown

| Signal | Weight | Data Source |
|---|---|---|
| 📈 Market Momentum | 25% | PokéTCG API (live prices vs 30d avg) |
| 🎴 Set Release Hype | 20% | PokéTCG API (release calendar) |
| 💬 Social Buzz | 18% | **Reddit API** (r/PokemonTCG sentiment) |
| ⚡ Price Volatility | 17% | PokéTCG API (1d vs 30d price variance) |
| 🔄 Reprint Sentiment | 10% | PokéTCG API (printing diversity proxy) |
| 📦 Sealed Product Hype | 10% | PokéTCG API (secret rare ratio) |

---

## Deploy to Vercel

```bash
# 1. Clone / unzip, then:
npm install

# 2. Set env vars
cp .env.example .env.local
# Fill in POKETCG_API_KEY and Reddit credentials (see below)

# 3. Test locally
npm run dev

# 4. Deploy
npx vercel
```

Or push to GitHub and import at [vercel.com/new](https://vercel.com/new).
Set all env vars in the Vercel dashboard under **Project → Settings → Environment Variables**.

---

## Reddit API Setup

The Social Buzz signal uses Reddit's OAuth2 "script" app flow (no user login required on the deployed site — it uses a bot account's credentials server-side).

1. Log in to Reddit and visit: https://www.reddit.com/prefs/apps
2. Click **"create another app"** at the bottom
3. Fill in:
   - **Name:** PokeSentiment
   - **Type:** ✅ script
   - **Redirect URI:** `http://localhost:3000` (required but not used)
4. Click **"create app"**
5. Copy the **string under the app name** → `REDDIT_CLIENT_ID`
6. Copy the **"secret"** value → `REDDIT_CLIENT_SECRET`
7. Set `REDDIT_USERNAME` / `REDDIT_PASSWORD` to your Reddit account

> ⚠️ Use a dedicated bot account. Reddit requires accounts to be > 30 days old for script API access.

Without Reddit credentials, the signal falls back to a time-of-day heuristic and shows an "Estimated" badge.

---

## PokéTCG API Key

Free key at [dev.pokemontcg.io](https://dev.pokemontcg.io/).
- Without a key: 1,000 requests/day
- With a key: 20,000 requests/day

Responses are cached for 30 minutes on Vercel's edge network, so typical daily usage is well within the free tier.

---

## Project Structure

```
app/
  api/index-data/route.ts   ← All 6 signal computations + API endpoint
  lib/reddit.ts             ← Reddit OAuth2 client + sentiment analysis
  components/
    Gauge.tsx               ← Responsive SVG gauge (ResizeObserver)
    HistoryChart.tsx        ← 30-day area chart (Recharts)
    SignalCard.tsx          ← Signal breakdown card with live/heuristic badge
    CardPriceRow.tsx        ← Card price table row
  globals.css               ← Design tokens + mobile breakpoints
  layout.tsx                ← HTML shell + fonts + viewport meta
  page.tsx                  ← Main page (client component)
```

---

## Extending Signals

Each signal is an isolated async function in `app/api/index-data/route.ts`.
To add a new signal:

1. Write an `async function signalX(): Promise<{ score: number; detail: string; live: boolean }>`
2. Add it to the `Promise.all` in the `GET` handler
3. Add a new entry to `signals[]` with name, icon, weight, and the result fields
4. Adjust all weights so they still sum to **1.0**

---

## Tech Stack

| Tool | Purpose |
|---|---|
| Next.js 15 (App Router) | Framework + API routes |
| TypeScript | Type safety |
| Recharts | History chart |
| PokéTCG API | Card price data |
| Reddit API (OAuth2) | Social sentiment |
| Tailwind CSS | Utility base |
| Vercel | Deployment + edge cache |

---

*Not financial advice. Pokémon card values can decline. Do your own research.*
