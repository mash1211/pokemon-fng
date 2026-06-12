'use client';

const ZONES = [
  { range:'0–24',   label:'Extreme Fear',  color:'#ef4444', bg:'#ef444412', desc:'Collectors panic-selling. Prices well below fundamental value. Historically a strong contrarian buying opportunity for patient investors.' },
  { range:'25–44',  label:'Fear',          color:'#f97316', bg:'#f9731612', desc:'Market hesitation. Secondary prices cooling. Buyers are cautious, creating negotiating power for buyers willing to hold long-term.' },
  { range:'45–55',  label:'Neutral',       color:'#eab308', bg:'#eab30812', desc:'Balanced supply and demand. Neither buyers nor sellers have a clear advantage. Typical of consolidation phases between major set releases.' },
  { range:'56–74',  label:'Greed',         color:'#22c55e', bg:'#22c55e12', desc:'FOMO buying emerging. Chase card prices rising faster than historical norms. Sealed product trading above MSRP. Exercise caution before large purchases.' },
  { range:'75–100', label:'Extreme Greed', color:'#16a34a', bg:'#16a34a12', desc:'Euphoria and speculation dominate. Cards pricing at all-time highs. Historically a warning sign — sentiment reversals are abrupt and can be severe.' },
];

export default function ScoreEducationSection() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {ZONES.map(z => (
        <div key={z.label} className="card" style={{ padding:'16px 20px', background:z.bg, border:`1px solid ${z.color}22` }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:z.color, flexShrink:0 }}/>
            <span style={{ fontSize:11, fontWeight:700, color:z.color, letterSpacing:0.5 }}>{z.range}</span>
            <span style={{ fontSize:14, fontWeight:700, color:z.color }}>{z.label}</span>
          </div>
          <p style={{ fontSize:12, color:'var(--text-sub)', lineHeight:1.65, marginLeft:22 }}>{z.desc}</p>
        </div>
      ))}
    </div>
  );
}
