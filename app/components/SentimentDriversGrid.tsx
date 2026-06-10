'use client';
import { useState } from 'react';
import type { Driver } from '../api/index-data/route';

export default function SentimentDriversGrid({ drivers }: { drivers: Driver[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="drivers-grid">
      {drivers.map(d => (
        <DriverCard key={d.id} driver={d} open={expanded===d.id} onToggle={()=>setExpanded(expanded===d.id?null:d.id)}/>
      ))}
    </div>
  );
}

function DriverCard({ driver: d, open, onToggle }: { driver: Driver; open: boolean; onToggle: () => void }) {
  const isPositive = d.score >= 55;
  return (
    <div className="card" style={{ border: `1px solid ${open ? d.color+'44' : 'var(--border)'}`, transition:'border-color 0.2s', overflow:'hidden' }}>
      <button onClick={onToggle} style={{ width:'100%', background:'none', border:'none', cursor:'pointer', padding:'14px 16px', textAlign:'left', display:'flex', flexDirection:'column', gap:10 }}>
        {/* Header row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ fontSize:17 }}>{d.icon}</span>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text-sub)' }}>{d.name}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', background:'var(--bg-deep)', padding:'2px 6px', borderRadius:4 }}>{d.weight}</span>
            <span style={{ color:'var(--text-dim)', fontSize:12, transform: open?'rotate(180deg)':'none', transition:'transform 0.2s' }}>▾</span>
          </div>
        </div>

        {/* Score + bar */}
        <div>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:7 }}>
            <span style={{ fontSize:22, fontWeight:800, color:d.color, lineHeight:1 }}>{d.score}</span>
            <span style={{ fontSize:11, fontWeight:600, color:d.color }}>{d.classification}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width:`${d.score}%`, background:`linear-gradient(90deg,${d.color}66,${d.color})` }}/>
          </div>
        </div>

        {/* Value vs avg */}
        <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
          <div>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2 }}>Current</div>
            <div style={{ fontSize:13, fontWeight:700, color: isPositive ? '#22c55e' : '#ef4444' }}>{d.value}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2 }}>Hist. Avg</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-sub)' }}>{d.historicalAverage}</div>
          </div>
        </div>
      </button>

      {/* Expanded explanation */}
      {open && (
        <div style={{ padding:'0 16px 14px', borderTop:'1px solid var(--border-dim)' }}>
          <p style={{ fontSize:12, color:'var(--text-sub)', lineHeight:1.65, marginTop:12 }}>{d.explanation}</p>
          {!d.live && <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:8, fontStyle:'italic' }}>⚠️ Estimated — add API credentials for live data</p>}
        </div>
      )}
    </div>
  );
}
