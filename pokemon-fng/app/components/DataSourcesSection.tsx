'use client';

const SOURCES = [
  { icon:'🛒', name:'eBay',          role:'Sold listings, real-time price discovery',  priority:1, url:'https://ebay.com' },
  { icon:'🃏', name:'TCGPlayer',     role:'Singles & sealed market prices',            priority:1, url:'https://tcgplayer.com' },
  { icon:'💲', name:'PriceCharting', role:'Historical price tracking',                 priority:1, url:'https://pricecharting.com' },
  { icon:'🏅', name:'PSA Pop',       role:'Graded card population reports',            priority:2, url:'https://psacard.com' },
  { icon:'🔵', name:'CGC Census',    role:'CGC graded card population',                priority:2, url:'https://cgccards.com' },
  { icon:'🟡', name:'BGS Pop',       role:'Beckett graded card population',            priority:2, url:'https://beckett.com' },
  { icon:'🔍', name:'Google Trends', role:'Search interest index',                     priority:3, url:'https://trends.google.com' },
  { icon:'🟠', name:'Reddit',        role:'Community sentiment (r/PokemonTCG)',        priority:3, url:'https://reddit.com/r/PokemonTCG' },
  { icon:'▶️', name:'YouTube',       role:'Video engagement & pack opening velocity',  priority:3, url:'https://youtube.com' },
  { icon:'✖️', name:'X / Twitter',   role:'Real-time collector conversation',          priority:3, url:'https://twitter.com' },
];

const TIER_COLORS = ['#22c55e','#f97316','#6c5dd3'];
const TIER_LABELS = ['Primary','Secondary','Social'];

export default function DataSourcesSection() {
  return (
    <div className="sources-grid">
      {SOURCES.map(s=>(
        <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
          style={{ textDecoration:'none' }}
          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor='#3a4060'}
          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}
        >
          <div className="card" style={{ padding:'12px 14px', height:'100%', transition:'border-color 0.2s', cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:20 }}>{s.icon}</span>
              <span style={{ fontSize:9, fontWeight:700, color:TIER_COLORS[s.priority-1], background:TIER_COLORS[s.priority-1]+'18', padding:'2px 6px', borderRadius:999 }}>
                {TIER_LABELS[s.priority-1]}
              </span>
            </div>
            <div style={{ fontWeight:700, fontSize:12, color:'var(--text)', marginBottom:4 }}>{s.name}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', lineHeight:1.5 }}>{s.role}</div>
          </div>
        </a>
      ))}
    </div>
  );
}
