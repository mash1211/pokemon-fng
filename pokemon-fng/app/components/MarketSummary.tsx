'use client';

export default function MarketSummary({ summary, score, label, color }: {
  summary: string;
  score: number;
  label: string;
  color: string;
}) {
  return (
    <div className="card" style={{ padding: '18px 20px', border: `1px solid ${color}33`, background: `linear-gradient(135deg, var(--bg-card) 0%, ${color}08 100%)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, animation: 'pulse-dot 2s ease-in-out infinite', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>AI Market Summary</span>
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.7 }}>
        {summary}
      </p>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, background: 'var(--bg-deep)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${score}%`, background: `linear-gradient(90deg, ${color}66, ${color})`, borderRadius: 999, transition: 'width 1s ease' }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>{score} / 100</span>
      </div>
    </div>
  );
}
