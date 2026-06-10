'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import MarketSummary from './components/MarketSummary';
import SentimentDriversGrid from './components/SentimentDriversGrid';
import MethodologySection from './components/MethodologySection';
import DataSourcesSection from './components/DataSourcesSection';
import ScoreEducationSection from './components/ScoreEducationSection';
import type { IndexData, ScoreComparison } from './api/index-data/route';

const Gauge                = dynamic(()=>import('./components/Gauge'),                {ssr:false});
const HistoricalIndexChart = dynamic(()=>import('./components/HistoricalIndexChart'), {ssr:false});
const TopMovers            = dynamic(()=>import('./components/TopMovers'),            {ssr:false});

function PokeballIcon({ size=30, spin=false }: { size?:number; spin?:boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true"
      style={spin?{animation:'spin-slow 8s linear infinite'}:undefined}>
      <circle cx="20" cy="20" r="18.5" stroke="#222840" strokeWidth="1.5"/>
      <path d="M2 20 Q3 7 20 1.5 Q37 7 38 20Z" fill="#e53935" opacity="0.85"/>
      <line x1="2" y1="20" x2="38" y2="20" stroke="#222840" strokeWidth="1.5"/>
      <circle cx="20" cy="20" r="5.5" fill="#111318" stroke="#222840" strokeWidth="1.5"/>
      <circle cx="20" cy="20" r="2.5" fill="#5c6480"/>
    </svg>
  );
}

function Skel({ h=14, w='100%' }: { h?:number; w?:string|number }) {
  return <div className="skeleton" style={{ height:h, width:w, borderRadius:6 }}/>;
}

function ComparisonCard({ item, color }: { item: ScoreComparison; color: string }) {
  const hasScore = item.score !== null;
  const hasDelta = item.delta !== null && item.label !== 'Now';
  return (
    <div className="card" style={{ padding:'12px 14px' }}>
      <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:8, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{item.label}</div>
      {hasScore ? (
        <>
          <div style={{ fontSize:24, fontWeight:800, color: item.label==='Now' ? color : 'var(--text)', lineHeight:1 }}>{item.score}</div>
          {hasDelta && item.delta !== null && (
            <div style={{ fontSize:11, fontWeight:600, color: item.delta>0?'#22c55e':item.delta<0?'#ef4444':'var(--text-muted)', marginTop:4 }}>
              {item.delta>0?'▲':item.delta<0?'▼':'–'} {Math.abs(item.delta)} pts
            </div>
          )}
        </>
      ) : <Skel h={24} w="60%"/>}
    </div>
  );
}

export default function Home() {
  const [data, setData]   = useState<IndexData|null>(null);
  const [load, setLoad]   = useState(true);
  const [err, setErr]     = useState<string|null>(null);
  const [ts, setTs]       = useState(new Date());
  const timer = useRef<ReturnType<typeof setInterval>|null>(null);

  async function refresh() {
    try {
      setLoad(true); setErr(null);
      const r = await fetch('/api/index-data');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
      setTs(new Date());
    } catch(e) {
      setErr('Could not load data — please try again.');
      console.error(e);
    } finally { setLoad(false); }
  }

  useEffect(()=>{
    refresh();
    timer.current = setInterval(refresh, 30*60*1000);
    return ()=>{ if(timer.current) clearInterval(timer.current); };
  },[]);

  const color = data?.color ?? '#6c5dd3';

  return (
    <div className="page-bg">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <PokeballIcon size={28}/>
          <div>
            <div style={{fontWeight:800,fontSize:15,letterSpacing:'-0.3px',lineHeight:1.1}}>PokéSentiment</div>
            <div style={{fontSize:9,color:'var(--text-muted)',marginTop:1,letterSpacing:0.3}}>TCG FEAR &amp; GREED INDEX</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span className="header-time" style={{fontSize:11,color:'var(--text-dim)'}}>
            {ts.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
          </span>
          {data && (
            <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:999,background:color+'18',color,border:`1px solid ${color}33`}}>
              {data.label}
            </span>
          )}
          <button onClick={refresh} disabled={load} aria-label="Refresh"
            style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,color:load?'var(--text-muted)':'var(--text)',padding:'7px 12px',fontSize:12,cursor:load?'default':'pointer',display:'flex',alignItems:'center',gap:5,opacity:load?0.55:1,fontFamily:'inherit'}}>
            <span style={{display:'inline-block',animation:load?'spin-slow 1s linear infinite':'none',fontSize:14}}>↻</span>
            {load?'Loading':'Refresh'}
          </button>
        </div>
      </header>

      <main className="page-content">
        {err && <div className="error-banner">⚠️ {err}</div>}

        {/* ── 1. HERO GAUGE ──────────────────────────────────────────────── */}
        <section className="hero-grid fade-up" aria-label="Fear and Greed Gauge">
          {/* Gauge panel */}
          <div className="card" style={{
            padding:'32px 20px 24px',
            display:'flex',flexDirection:'column',alignItems:'center',gap:12,
            border:`1px solid ${data?color+'44':'var(--border)'}`,
            boxShadow:data?`0 0 60px ${color}14`:'none',
            transition:'box-shadow 0.8s',
          }}>
            {load&&!data ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,padding:'50px 0'}}>
                <PokeballIcon size={50} spin/>
                <p style={{color:'var(--text-muted)',fontSize:13}}>Crunching market signals…</p>
              </div>
            ) : data ? (
              <>
                <Gauge score={data.score} label={data.label} color={data.color}/>
                <p style={{fontSize:10,color:'var(--text-dim)',textAlign:'center'}}>
                  Updated {new Date(data.lastUpdated).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}
                </p>
              </>
            ) : null}
          </div>

          {/* Sidebar */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* 2. SCORE COMPARISON CARDS */}
            <div className="score-strip">
              {data ? data.comparison.map((c,i)=>(
                <ComparisonCard key={i} item={c} color={color}/>
              )) : Array.from({length:6}).map((_,i)=>(
                <div key={i} className="card" style={{padding:'12px 14px'}}>
                  <Skel h={10} w="60%"/><div style={{marginTop:8}}><Skel h={24} w="50%"/></div>
                </div>
              ))}
            </div>

            {/* 3. AI MARKET SUMMARY */}
            {data ? (
              <MarketSummary summary={data.marketSummary} score={data.score} label={data.label} color={data.color}/>
            ) : (
              <div className="card" style={{padding:'18px 20px'}}>
                <Skel h={10} w="40%"/>
                <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:6}}>
                  <Skel h={12}/><Skel h={12} w="90%"/><Skel h={12} w="80%"/>
                </div>
              </div>
            )}

            {/* Score classification quick-ref */}
            <div className="card" style={{overflow:'hidden',padding:0}}>
              {[
                {range:'0–24',   label:'Extreme Fear',  color:'#ef4444'},
                {range:'25–44',  label:'Fear',          color:'#f97316'},
                {range:'45–55',  label:'Neutral',       color:'#eab308'},
                {range:'56–74',  label:'Greed',         color:'#22c55e'},
                {range:'75–100', label:'Extreme Greed', color:'#16a34a'},
              ].map((z,i)=>{
                const [lo,hi]=z.range.split('–').map(Number);
                const active=!!data&&data.score>=lo&&data.score<=hi;
                return(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',background:active?z.color+'16':'transparent',borderBottom:i<4?'1px solid var(--border-dim)':'none'}}>
                    <span style={{width:7,height:7,borderRadius:'50%',background:z.color,flexShrink:0}}/>
                    <span style={{color:z.color,fontSize:11,fontWeight:600,width:36,flexShrink:0}}>{z.range}</span>
                    <span style={{fontSize:12,color:active?'var(--text)':'var(--text-muted)',fontWeight:active?600:400}}>{z.label}</span>
                    {active&&<span style={{marginLeft:'auto',fontSize:9,fontWeight:700,color:z.color,letterSpacing:0.5}}>◀ NOW</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 4. SENTIMENT DRIVERS GRID ──────────────────────────────────── */}
        <h2 className="section-title fade-up-1">
          Sentiment Drivers
          <span className="section-subtitle">Click any driver to expand</span>
        </h2>
        <div className="fade-up-1">
          {data ? <SentimentDriversGrid drivers={data.drivers}/>
            : <div className="drivers-grid">{Array.from({length:8}).map((_,i)=><div key={i} className="card" style={{padding:'14px 16px',height:140}}><Skel h={12} w="55%"/><div style={{marginTop:10}}><Skel h={28} w="40%"/></div><div style={{marginTop:8}}><Skel h={5}/></div></div>)}</div>}
        </div>

        {/* ── 5. HISTORICAL CHART ────────────────────────────────────────── */}
        <h2 className="section-title fade-up-2">
          Historical Index
          <span className="section-subtitle">7D / 30D / 90D / 1Y / All Time</span>
        </h2>
        <div className="card fade-up-2" style={{padding:'20px 16px 14px'}}>
          {data ? <HistoricalIndexChart data={data.history}/>
            : <Skel h={220}/>}
        </div>

        {/* ── 6. TOP MOVERS ──────────────────────────────────────────────── */}
        <h2 className="section-title fade-up-3">
          Top Movers
          <span className="section-subtitle">Top 10 gainers and losers · 24H / 7D / 30D</span>
        </h2>
        <div className="fade-up-3">
          {data ? <TopMovers gainers={data.gainers} losers={data.losers}/>
            : <div className="card" style={{height:300,display:'flex',alignItems:'center',justifyContent:'center'}}><PokeballIcon size={36} spin/></div>}
        </div>

        {/* ── 7. METHODOLOGY ─────────────────────────────────────────────── */}
        <h2 className="section-title fade-up-3">
          Methodology
          <span className="section-subtitle">How each signal is calculated</span>
        </h2>
        <div className="fade-up-3"><MethodologySection/></div>

        {/* ── 8. DATA SOURCES ────────────────────────────────────────────── */}
        <h2 className="section-title fade-up-4">
          Data Sources
          <span className="section-subtitle">Priority-ranked by signal confidence</span>
        </h2>
        <div className="fade-up-4"><DataSourcesSection/></div>

        {/* ── Score education ─────────────────────────────────────────────── */}
        <h2 className="section-title fade-up-4">Understanding the Score</h2>
        <div className="fade-up-4"><ScoreEducationSection/></div>

        {/* ── 9. DISCLAIMER ──────────────────────────────────────────────── */}
        <div className="card-deep" style={{marginTop:40,padding:'18px 22px',fontSize:11,color:'var(--text-muted)',lineHeight:1.75}}>
          <div style={{fontWeight:700,color:'var(--text-sub)',marginBottom:6,fontSize:12}}>⚠️ Important Disclaimer</div>
          <p>PokéSentiment is for <strong>informational and entertainment purposes only</strong>. Nothing on this site constitutes financial, investment, or trading advice. The Pokémon TCG market involves real financial risk — card values can and do decline significantly, sometimes rapidly. Past sentiment readings do not predict future prices.</p>
          <p style={{marginTop:8}}>Always conduct your own research before buying or selling cards. Consider consulting a qualified financial advisor before making significant purchases. Data is sourced from third-party APIs and may be delayed, incomplete, or inaccurate. PokéSentiment is not affiliated with The Pokémon Company, Nintendo, eBay, TCGPlayer, PSA, CGC, or Beckett.</p>
          <p style={{marginTop:8,color:'var(--text-dim)'}}>Index refreshes every 30 minutes · Data sourced from PokéTCG API, Reddit API, YouTube Data API v3, PokeBeach, Limitless TCG, and SerpAPI Google Trends</p>
        </div>
      </main>
    </div>
  );
}
