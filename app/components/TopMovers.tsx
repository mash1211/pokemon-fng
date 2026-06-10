'use client';
import { useState } from 'react';
import type { CardMover } from '../api/index-data/route';

type Period = '24H'|'7D'|'30D';

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data?.length) return <div style={{width:60,height:28}}/>;
  const min = Math.min(...data), max = Math.max(...data), range = max-min||1;
  const w=60, h=28, pad=2;
  const pts = data.map((v,i)=>`${pad+(i/(data.length-1))*(w-pad*2)},${h-pad-(((v-min)/range)*(h-pad*2))}`).join(' ');
  const color = positive ? '#22c55e' : '#ef4444';
  return(
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="sparkline">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MoverRow({ mover, period, rank }: { mover: CardMover; period: Period; rank: number }) {
  const ch = period==='24H' ? mover.change24h : period==='7D' ? mover.change7d : mover.change30d;
  const up = ch >= 0;
  return(
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border-dim)'}}>
      <span style={{width:18,fontSize:11,fontWeight:600,color:'var(--text-muted)',flexShrink:0,textAlign:'right'}}>{rank}</span>
      <div style={{width:36,height:50,borderRadius:5,overflow:'hidden',background:'var(--bg-card2)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid var(--border)'}}>
        {mover.imageUrl
          ? <img src={mover.imageUrl} alt={mover.name} style={{width:'100%',height:'100%',objectFit:'cover'}} loading="lazy"/>
          : <span style={{fontSize:16}}>🎴</span>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:600,fontSize:12,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{mover.name}</div>
        <div style={{fontSize:10,color:'var(--text-muted)',marginTop:1,display:'flex',alignItems:'center',gap:6}}>
          <span>{mover.set}</span>
          <span style={{fontSize:9,fontWeight:700,color:'var(--text-muted)',background:'var(--bg-deep)',padding:'1px 5px',borderRadius:3}}>{mover.category}</span>
        </div>
        <div style={{fontSize:10,color:'var(--text-dim)',marginTop:1}}>{mover.volume} sales</div>
      </div>
      <div style={{textAlign:'right',flexShrink:0}}>
        <div style={{fontWeight:700,fontSize:13,color:'var(--text)'}}>${mover.price.toFixed(2)}</div>
        <div style={{fontSize:12,fontWeight:700,color:up?'#22c55e':'#ef4444',marginTop:1}}>{up?'▲':'▼'}{Math.abs(ch).toFixed(1)}%</div>
      </div>
      <Sparkline data={mover.spark} positive={up}/>
    </div>
  );
}

export default function TopMovers({ gainers, losers }: { gainers: CardMover[]; losers: CardMover[] }) {
  const [period, setPeriod] = useState<Period>('30D');
  const [tab, setTab] = useState<'gainers'|'losers'>('gainers');
  const list = tab==='gainers' ? gainers : losers;

  return(
    <div className="card" style={{overflow:'hidden'}}>
      {/* Controls */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,padding:'14px 16px',borderBottom:'1px solid var(--border-dim)'}}>
        <div className="tab-bar">
          <button className={`tab-btn${tab==='gainers'?' active':''}`} onClick={()=>setTab('gainers')}>▲ Top Gainers</button>
          <button className={`tab-btn${tab==='losers'?' active':''}`}  onClick={()=>setTab('losers')}>▼ Top Losers</button>
        </div>
        <div className="tab-bar">
          {(['24H','7D','30D'] as Period[]).map(p=>(
            <button key={p} className={`tab-btn${period===p?' active':''}`} onClick={()=>setPeriod(p)}>{p}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{padding:'0 16px'}}>
        {list.slice(0,10).map((m,i)=>(
          <MoverRow key={m.id} mover={m} period={period} rank={i+1}/>
        ))}
        {!list.length&&(
          <div style={{textAlign:'center',padding:'32px 0',color:'var(--text-muted)',fontSize:13}}>No data available</div>
        )}
      </div>
    </div>
  );
}
