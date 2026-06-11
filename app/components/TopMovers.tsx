'use client';
import { useState } from 'react';
import type { CardMover } from '../api/index-data/route';

type Period = '24H'|'7D'|'30D';

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data?.length) return <div style={{width:60,height:28}}/>;
  const min=Math.min(...data), max=Math.max(...data), range=max-min||1;
  const w=60, h=28, pad=2;
  const pts=data.map((v,i)=>`${pad+(i/(data.length-1))*(w-pad*2)},${h-pad-(((v-min)/range)*(h-pad*2))}`).join(' ');
  const color=positive?'#22c55e':'#ef4444';
  // Filled area path
  const first=`${pad},${h-pad}`;
  const last=`${pad+(data.length-1)/(data.length-1)*(w-pad*2)},${h-pad}`;
  const fillPts=`${first} ${pts} ${last}`;
  return(
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="sparkline">
      <polygon points={fillPts} fill={color} opacity={0.12}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle
        cx={pad+(data.length-1)/(data.length-1)*(w-pad*2)}
        cy={h-pad-(((data[data.length-1]-min)/range)*(h-pad*2))}
        r="2.5" fill={color}
      />
    </svg>
  );
}

function MoverRow({ mover, period, rank }: { mover: CardMover; period: Period; rank: number }) {
  const ch = period==='24H' ? mover.change24h : period==='7D' ? mover.change7d : mover.change30d;
  const up = ch >= 0;
  const url = mover.itemWebUrl;

  const inner = (
    <div
      style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border-dim)',cursor:url?'pointer':'default',transition:'background 0.15s'}}
      onMouseEnter={e=>url&&((e.currentTarget as HTMLElement).style.background='var(--bg-card2)')}
      onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background='transparent')}
    >
      <span style={{width:18,fontSize:11,fontWeight:600,color:'var(--text-muted)',flexShrink:0,textAlign:'right'}}>{rank}</span>
      <div style={{width:36,height:50,borderRadius:5,overflow:'hidden',background:'var(--bg-card2)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid var(--border)'}}>
        {mover.imageUrl
          ? <img src={mover.imageUrl} alt={mover.name} style={{width:'100%',height:'100%',objectFit:'cover'}} loading="lazy"/>
          : <span style={{fontSize:16}}>🎴</span>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:600,fontSize:12,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{mover.name}</div>
        <div style={{fontSize:10,color:'var(--text-muted)',marginTop:1,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
          <span>{mover.set}</span>
          {mover.category && (
            <span style={{fontSize:9,fontWeight:700,color:'var(--text-muted)',background:'var(--bg-deep)',padding:'1px 5px',borderRadius:3}}>{mover.category}</span>
          )}
        </div>
        <div style={{fontSize:10,color:'var(--text-dim)',marginTop:1}}>{mover.volume} sales · {mover.rarity}</div>
      </div>
      <div style={{textAlign:'right',flexShrink:0,marginRight:4}}>
        <div style={{fontWeight:700,fontSize:13,color:'var(--text)'}}>${mover.price.toFixed(2)}</div>
        <div style={{fontSize:12,fontWeight:700,color:up?'#22c55e':'#ef4444',marginTop:1}}>{up?'▲':'▼'}{Math.abs(ch).toFixed(1)}%</div>
      </div>
      <Sparkline data={mover.spark} positive={up}/>
      {url && <span style={{color:'var(--text-dim)',fontSize:11,flexShrink:0}}>›</span>}
    </div>
  );

  if (url) {
    return <a href={url} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none',display:'block'}}>{inner}</a>;
  }
  return inner;
}

export default function TopMovers({ gainers, losers, live }: { gainers: CardMover[]; losers: CardMover[]; live?: boolean }) {
  const [period, setPeriod] = useState<Period>('30D');
  const [tab, setTab] = useState<'gainers'|'losers'>('gainers');

  const list = tab==='gainers' ? gainers : losers;

  // Re-sort by selected period
  const sorted = [...list].sort((a, b) => {
    const ca = period==='24H'?a.change24h:period==='7D'?a.change7d:a.change30d;
    const cb = period==='24H'?b.change24h:period==='7D'?b.change7d:b.change30d;
    return tab==='gainers' ? cb-ca : ca-cb;
  });

  return(
    <div className="card" style={{overflow:'hidden'}}>
      {/* Controls */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,padding:'14px 16px',borderBottom:'1px solid var(--border-dim)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div className="tab-bar">
            <button className={`tab-btn${tab==='gainers'?' active':''}`} onClick={()=>setTab('gainers')}>▲ Top Gainers</button>
            <button className={`tab-btn${tab==='losers'?' active':''}`}  onClick={()=>setTab('losers')}>▼ Top Losers</button>
          </div>
          {live
            ? <span className="badge badge-live">Live from eBay</span>
            : <span className="badge badge-est">PokéTCG prices</span>
          }
        </div>
        <div className="tab-bar">
          {(['24H','7D','30D'] as Period[]).map(p=>(
            <button key={p} className={`tab-btn${period===p?' active':''}`} onClick={()=>setPeriod(p)}>{p}</button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'6px 16px',borderBottom:'1px solid var(--border-dim)',background:'var(--bg-deep)'}}>
        <span style={{width:18,flexShrink:0}}/>
        <span style={{width:36,flexShrink:0}}/>
        <span style={{flex:1,fontSize:10,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase',letterSpacing:0.5}}>Card</span>
        <span style={{width:80,fontSize:10,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase',letterSpacing:0.5,textAlign:'right',marginRight:4}}>Price / Chg</span>
        <span style={{width:60,fontSize:10,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase',letterSpacing:0.5,textAlign:'center'}}>7D Chart</span>
      </div>

      {/* List */}
      <div style={{padding:'0 16px'}}>
        {sorted.length > 0
          ? sorted.slice(0,10).map((m,i)=>(
              <MoverRow key={m.id} mover={m} period={period} rank={i+1}/>
            ))
          : (
            <div style={{textAlign:'center',padding:'32px 0',color:'var(--text-muted)',fontSize:13}}>
              <div style={{fontSize:24,marginBottom:8}}>📊</div>
              {live ? 'No sold listings found for this period' : 'Add eBay API keys to see real sold listing data'}
            </div>
          )
        }
      </div>

      {/* Footer */}
      <div style={{padding:'10px 16px',borderTop:'1px solid var(--border-dim)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:10,color:'var(--text-dim)'}}>
          {live ? 'Source: eBay completed listings · Click any row to view on eBay' : 'Source: PokéTCG CardMarket prices'}
        </span>
        {live && (
          <a href="https://www.ebay.com/sch/i.html?_nkw=pokemon+card&_sacat=183454&LH_Sold=1"
            target="_blank" rel="noopener noreferrer"
            style={{fontSize:10,color:'var(--accent)',fontWeight:600}}>
            View all on eBay →
          </a>
        )}
      </div>
    </div>
  );
}
