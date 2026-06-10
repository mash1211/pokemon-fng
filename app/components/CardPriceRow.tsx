'use client';
import type { CardMover } from '../api/index-data/route';

export default function CardPriceRow({ card, rank }: { card: CardMover; rank: number }) {
  const up = card.change30d >= 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom: rank<10?'1px solid var(--border-dim)':'none' }}>
      <span style={{ width:20, color:'var(--text-dim)', fontSize:12, fontWeight:600, textAlign:'center', flexShrink:0 }}>{rank}</span>
      <div style={{ width:38, height:52, borderRadius:5, overflow:'hidden', background:'var(--bg-card2)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)' }}>
        {card.imageUrl ? <img src={card.imageUrl} alt={card.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy"/> : <span style={{ fontSize:18 }}>🎴</span>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{card.name}</div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{card.set}</div>
        <div style={{ fontSize:10, color:'var(--text-dim)', marginTop:1 }}>{card.rarity}</div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>${card.price.toFixed(2)}</div>
        <div style={{ fontSize:11, fontWeight:600, color:up?'#22c55e':'#ef4444', marginTop:2 }}>{up?'▲':'▼'}{Math.abs(card.change30d).toFixed(1)}%</div>
      </div>
    </div>
  );
}
