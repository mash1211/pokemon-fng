'use client';
import { useEffect, useRef, useState } from 'react';

interface GaugeProps { score: number; label: string; color: string; }

function toRad(d: number) { return (d - 90) * Math.PI / 180; }
function pt(deg: number, r: number, cx: number, cy: number) {
  const rad = toRad(deg);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arc(s: number, e: number, R: number, cx: number, cy: number, T: number) {
  const i = R - T;
  const [s1,e1,s2,e2] = [pt(s,R,cx,cy),pt(e,R,cx,cy),pt(e,i,cx,cy),pt(s,i,cx,cy)];
  const lg = e-s>180?1:0;
  return `M${s1.x} ${s1.y} A${R} ${R} 0 ${lg} 1 ${e1.x} ${e1.y} L${s2.x} ${s2.y} A${i} ${i} 0 ${lg} 0 ${e2.x} ${e2.y}Z`;
}

const SEGS = [
  { lo:0,   hi:24,  color:'#ef4444', label:'Extreme Fear',  start:-135, end:-81.6 },
  { lo:24,  hi:44,  color:'#f97316', label:'Fear',          start:-81.6, end:-27 },
  { lo:44,  hi:55,  color:'#eab308', label:'Neutral',       start:-27,   end:  0  },
  { lo:55,  hi:74,  color:'#22c55e', label:'Greed',         start:  0,   end: 54  },
  { lo:74,  hi:100, color:'#16a34a', label:'Ext. Greed',    start: 54,   end:135  },
];

export default function Gauge({ score, label, color }: GaugeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(320);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new ResizeObserver(es => {
      setSize(Math.min(400, Math.max(260, es[0].contentRect.width)));
    });
    obs.observe(el);
    setSize(Math.min(400, Math.max(260, el.offsetWidth)));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let raf: number;
    const t0 = performance.now(), dur = 1000;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(ease * score));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  // Keep arc inside a padded viewBox so labels never clip
  const pad   = size * 0.14;          // horizontal padding for labels
  const vw    = size + pad * 2;       // viewBox width — wider than size
  const cx    = vw / 2;               // centre x in the wider viewBox
  const cy    = size * 0.54;          // centre y
  const R     = size * 0.36;          // arc outer radius
  const T     = size * 0.076;         // arc thickness
  const vh    = size * 0.76;          // viewBox height
  const fs    = Math.max(9, size * 0.030); // label font size

  const needleDeg = -135 + (display / 100) * 270;
  const tip = pt(needleDeg, R - T / 2, cx, cy);

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg
        width="100%"
        height={vh}
        viewBox={`0 0 ${vw} ${vh}`}
        role="img"
        aria-label={`Fear and Greed: ${display} — ${label}`}
        style={{ overflow: 'visible' }}
      >
        {/* Ghost tracks */}
        {SEGS.map((s,i) => (
          <path key={i} d={arc(s.start,s.end,R,cx,cy,T)} fill={s.color} opacity={0.13}/>
        ))}

        {/* Active fill */}
        {SEGS.map((s,i) => {
          if (display <= s.lo) return null;
          const fillEnd = display >= s.hi
            ? s.end
            : s.start + ((display - s.lo) / (s.hi - s.lo)) * (s.end - s.start);
          return <path key={`f${i}`} d={arc(s.start, fillEnd, R, cx, cy, T)} fill={s.color} opacity={0.9}/>;
        })}

        {/* Segment labels — placed just outside the arc */}
        {SEGS.map((s,i) => {
          const mid = (s.start + s.end) / 2;
          const labelR = R + T + size * 0.055;
          const pos = pt(mid, labelR, cx, cy);
          return (
            <text
              key={`l${i}`}
              x={pos.x} y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#3d4468"
              fontSize={fs}
              fontFamily="Inter,system-ui"
            >
              {s.label}
            </text>
          );
        })}

        {/* Hub glow */}
        <circle cx={cx} cy={cy} r={T*0.6}  fill={color} opacity={0.15}/>
        <circle cx={cx} cy={cy} r={T*0.32} fill={color} opacity={0.5}/>

        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={tip.x} y2={tip.y}
          stroke={color}
          strokeWidth={size * 0.012}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={size * 0.022} fill={color}/>

        {/* Score number — below the hub with clear spacing */}
        <text
          x={cx}
          y={cy + size * 0.17}
          textAnchor="middle"
          fill={color}
          fontSize={size * 0.148}
          fontWeight="800"
          fontFamily="Inter,system-ui"
          letterSpacing="-1"
        >
          {display}
        </text>

        {/* Label text below score */}
        <text
          x={cx}
          y={cy + size * 0.265}
          textAnchor="middle"
          fill={color}
          fontSize={size * 0.050}
          fontWeight="600"
          fontFamily="Inter,system-ui"
          opacity={0.85}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
