'use client';
import { useState } from 'react';

const METHODS = [
  { icon:'📈', name:'Market Momentum', w:'20%', priority:'Primary', desc:'Tracks price performance of premium cards (Illustration Rare, Special Illustration Rare, Hyper Rare) vs 30-day averages. Sourced from PokéTCG API / CardMarket price history.', sources:['PokéTCG API','CardMarket'] },
  { icon:'📊', name:'Trading Volume',  w:'15%', priority:'Primary', desc:'Measures relative buying velocity — ratio of 1-day average price to 7-day average as a proxy for transaction frequency. High ratios indicate elevated market participation.', sources:['PokéTCG API','eBay Sold'] },
  { icon:'🔁', name:'Sell-Through Rate', w:'15%', priority:'Primary', desc:'Ratio of completed sales to active listings. A sell-through above the 52% historical average signals demand outpacing supply. Data sourced from TCGPlayer and eBay completed listings.', sources:['TCGPlayer','eBay Sold','PriceCharting'] },
  { icon:'🧬', name:'Population Growth', w:'10%', priority:'Secondary', desc:'Monitors PSA, CGC, and BGS graded card population growth. Rapid grading supply expansion can suppress slab premiums and overall market confidence.', sources:['PSA Pop Report','CGC Census','BGS Pop Report'] },
  { icon:'💬', name:'Social Sentiment', w:'10%', priority:'Secondary', desc:'Composite NLP sentiment from Reddit (r/PokemonTCG, r/pokemon), YouTube video engagement velocity, PokeBeach forum activity, and competitive tournament participation.', sources:['Reddit API','YouTube Data API','PokeBeach','Limitless TCG'] },
  { icon:'🔍', name:'Google Trends',   w:'10%', priority:'Secondary', desc:'Relative search volume index for "pokemon cards" and related queries via SerpAPI. Rising interest typically leads secondary market price appreciation by 3–7 days.', sources:['Google Trends (SerpAPI)'] },
  { icon:'📦', name:'Sealed Premium',  w:'10%', priority:'Secondary', desc:'Measures how far sealed booster boxes and ETBs trade above MSRP. A premium above 1.5x MSRP historically signals greed. Below 1.0x indicates fear or excess supply.', sources:['eBay Sold','TCGPlayer','PriceCharting'] },
  { icon:'⚡', name:'Volatility',      w:'10%', priority:'Secondary', desc:'Standard deviation of card prices over the last 30 days relative to the mean. High volatility (>20%) is treated as a fear signal; low, stable prices indicate confidence.', sources:['PokéTCG API','CardMarket'] },
];

export default function MethodologySection() {
  const [open, setOpen] = useState<string|null>(null);

  return (
    <div className="method-grid">
      {METHODS.map(m => (
        <div key={m.name} className="card" style={{ overflow:'hidden', border: open===m.name ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
          <button onClick={()=>setOpen(open===m.name?null:m.name)} style={{ width:'100%', background:'none', border:'none', cursor:'pointer', padding:'14px 16px', textAlign:'left', fontFamily:'inherit' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:18 }}>{m.icon}</span>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{m.name}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:10, fontWeight:700, color:'var(--accent)', background:'var(--accent-soft)', padding:'2px 7px', borderRadius:999 }}>{m.w}</span>
                <span style={{ color:'var(--text-dim)', fontSize:12, transform:open===m.name?'rotate(180deg)':'none', transition:'transform 0.2s' }}>▾</span>
              </div>
            </div>
            <div style={{ fontSize:10, fontWeight:600, color: m.priority==='Primary'?'#22c55e':'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.6 }}>{m.priority} signal</div>
          </button>
          {open===m.name && (
            <div style={{ padding:'0 16px 16px', borderTop:'1px solid var(--border-dim)' }}>
              <p style={{ fontSize:12, color:'var(--text-sub)', lineHeight:1.65, marginTop:12, marginBottom:12 }}>{m.desc}</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {m.sources.map(s=>(
                  <span key={s} style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', background:'var(--bg-deep)', padding:'3px 8px', borderRadius:5, border:'1px solid var(--border-dim)' }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
