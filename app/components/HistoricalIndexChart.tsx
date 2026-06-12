'use client';
import { useRef, useState, useEffect } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { HistoryPoint } from '../api/index-data/route';

type TF = '7D'|'30D'|'90D'|'1Y'|'All';
type View = 'overall'|'drivers';

const TF_DAYS: Record<TF,number> = {'7D':7,'30D':30,'90D':90,'1Y':365,'All':730};

const DRIVER_SERIES = [
  { key:'marketMomentum',   label:'Momentum',   color:'#6c5dd3' },
  { key:'tradingVolume',    label:'Volume',      color:'#3b82f6' },
  { key:'sellThroughRate',  label:'Sell-Through',color:'#22c55e' },
  { key:'socialSentiment',  label:'Social',      color:'#f97316' },
  { key:'sealedPremium',    label:'Sealed',      color:'#a78bfa' },
  { key:'volatility',       label:'Volatility',  color:'#eab308' },
];

function scoreColor(s:number){if(s<=24)return'#ef4444';if(s<=44)return'#f97316';if(s<=55)return'#eab308';if(s<=74)return'#22c55e';return'#16a34a';}

const Tip=({active,payload}:{active?:boolean;payload?:Array<{dataKey:string;value:number;color:string}>})=>{
  if(!active||!payload?.length)return null;
  return(
    <div style={{background:'#111318',border:'1px solid #222840',borderRadius:10,padding:'10px 14px',minWidth:130}}>
      {payload.map(p=>{
        const s=DRIVER_SERIES.find(d=>d.key===p.dataKey);
        return(
          <div key={p.dataKey} style={{display:'flex',justifyContent:'space-between',gap:14,marginBottom:2}}>
            <span style={{fontSize:11,color:p.color}}>{s?.label??'Score'}</span>
            <span style={{fontSize:11,fontWeight:700,color:scoreColor(p.value)}}>{p.value}</span>
          </div>
        );
      })}
    </div>
  );
};

export default function HistoricalIndexChart({ data }: { data: HistoryPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mobile,setMobile]=useState(false);
  const [tf,setTf]=useState<TF>('30D');
  const [view,setView]=useState<View>('overall');
  const [vis,setVis]=useState(new Set(['marketMomentum','socialSentiment']));

  useEffect(()=>{
    const check=()=>setMobile((ref.current?.offsetWidth??600)<480);
    check(); window.addEventListener('resize',check);
    return ()=>window.removeEventListener('resize',check);
  },[]);

  const sliced=data.slice(-TF_DAYS[tf]);
  const last=sliced[sliced.length-1];
  const mainColor=last?scoreColor(last.score):'#6c5dd3';
  const tickGap=mobile?Math.max(1,Math.floor(sliced.length/4)):Math.max(1,Math.floor(sliced.length/7));

  const toggle=(k:string)=>setVis(prev=>{const n=new Set(prev);if(n.has(k)){if(n.size>1)n.delete(k);}else n.add(k);return n;});

  return(
    <div ref={ref}>
      {/* Controls */}
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>
        <div className="tab-bar">
          {(['7D','30D','90D','1Y','All'] as TF[]).map(t=>(
            <button key={t} className={`tab-btn${tf===t?' active':''}`} onClick={()=>setTf(t)}>{t}</button>
          ))}
        </div>
        <div className="tab-bar" style={{marginLeft:'auto'}}>
          <button className={`tab-btn${view==='overall'?' active':''}`} onClick={()=>setView('overall')}>Overall</button>
          <button className={`tab-btn${view==='drivers'?' active':''}`} onClick={()=>setView('drivers')}>Drivers</button>
        </div>
      </div>

      {/* Driver toggles */}
      {view==='drivers'&&(
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
          {DRIVER_SERIES.map(s=>(
            <button key={s.key} onClick={()=>toggle(s.key)} style={{
              display:'flex',alignItems:'center',gap:5,padding:'3px 10px',
              borderRadius:999,border:`1px solid ${vis.has(s.key)?s.color+'66':'var(--border)'}`,
              background:vis.has(s.key)?s.color+'14':'transparent',
              color:vis.has(s.key)?s.color:'var(--text-muted)',
              fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',
            }}>
              <span style={{width:6,height:6,borderRadius:'50%',background:vis.has(s.key)?s.color:'var(--text-dim)',flexShrink:0}}/>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      <div style={{width:'100%',height:mobile?160:210}}>
        <ResponsiveContainer>
          {view==='overall'?(
            <ComposedChart data={sliced} margin={{top:6,right:4,left:mobile?-30:-22,bottom:0}}>
              <defs>
                <linearGradient id="og" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={mainColor} stopOpacity={0.28}/>
                  <stop offset="95%" stopColor={mainColor} stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{fill:'#323756',fontSize:10}} tickLine={false} axisLine={false} interval={tickGap}/>
              <YAxis domain={[0,100]} tick={{fill:'#323756',fontSize:10}} tickLine={false} axisLine={false} ticks={[0,25,50,75,100]}/>
              <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.2}/>
              <ReferenceLine y={55} stroke="#6c5dd3" strokeDasharray="3 3" strokeOpacity={0.15}/>
              <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.2}/>
              <Tooltip content={<Tip/>} cursor={{stroke:'#222840',strokeWidth:1}}/>
              <Area type="monotone" dataKey="score" stroke={mainColor} strokeWidth={2.5} fill="url(#og)" dot={false} activeDot={{r:4,fill:mainColor,strokeWidth:0}}/>
            </ComposedChart>
          ):(
            <ComposedChart data={sliced} margin={{top:6,right:4,left:mobile?-30:-22,bottom:0}}>
              <XAxis dataKey="date" tick={{fill:'#323756',fontSize:10}} tickLine={false} axisLine={false} interval={tickGap}/>
              <YAxis domain={[0,100]} tick={{fill:'#323756',fontSize:10}} tickLine={false} axisLine={false} ticks={[0,25,50,75,100]}/>
              <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.18}/>
              <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.18}/>
              <Tooltip content={<Tip/>} cursor={{stroke:'#222840',strokeWidth:1}}/>
              {DRIVER_SERIES.filter(s=>vis.has(s.key)).map(s=>(
                <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={1.8} dot={false} activeDot={{r:3,strokeWidth:0}}/>
              ))}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      <div style={{textAlign:'center',marginTop:6,fontSize:10,color:'var(--text-dim)'}}>
        {sliced[0]?.date} — {sliced[sliced.length-1]?.date} · {sliced.length} daily points
      </div>
    </div>
  );
}
