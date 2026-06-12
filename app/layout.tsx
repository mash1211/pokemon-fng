import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PokéSentiment — TCG Fear & Greed Index",
  description: "Real-time fear and greed index for the Pokémon TCG market. Tracks market momentum, set release hype, Reddit sentiment, price volatility, and more.",
  openGraph: {
    title: "PokéSentiment — Pokémon TCG Fear & Greed Index",
    description: "Is the Pokémon card market fearful or greedy right now?",
    type: "website",
  },
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d0f12',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
