const SERIF = "'Cormorant Garamond', Georgia, serif";

interface SignalMeterProps {
  value: number;
  connected: boolean;
  label?: string;
}

export default function SignalMeter({ value, connected, label = "SIGNAL" }: SignalMeterProps) {
  const clamp = Math.max(0, Math.min(100, value));
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const cx = 100;
  const cy = 108;
  const R  = 74;
  const startDeg = -210;
  const sweep    = 240;
  const endDeg   = startDeg + sweep;
  const fillDeg  = startDeg + (clamp / 100) * sweep;

  function arcPt(deg: number, r: number) {
    const a = toRad(deg);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  function arcPath(from: number, to: number, r: number): string {
    const s = arcPt(from, r);
    const e = arcPt(to, r);
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  }

  // Warm amber when live — classic VU meter backlight color
  const activeColor = connected ? "#E8A020" : "#FF5533";
  const dimColor    = connected ? "rgba(232,160,32,0.16)" : "rgba(255,85,51,0.16)";
  const glowColor   = connected ? "rgba(232,160,32,0.55)" : "rgba(255,85,51,0.5)";

  const needlePt = arcPt(fillDeg, R - 10);

  const ticks = [0, 25, 50, 75, 100].map(pct => {
    const deg = startDeg + (pct / 100) * sweep;
    return { outer: arcPt(deg, R - 1), inner: arcPt(deg, R - 12), pct };
  });

  const minorTicks = [12.5, 37.5, 62.5, 87.5].map(pct => {
    const deg = startDeg + (pct / 100) * sweep;
    return { outer: arcPt(deg, R - 1), inner: arcPt(deg, R - 7), pct };
  });

  // dB-style labels at key points
  const dbLabels = [
    { pct: 0,   label: "-∞" },
    { pct: 50,  label: "0"  },
    { pct: 85,  label: "+3" },
    { pct: 100, label: "+6" },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="122" viewBox="0 0 200 122">
        {/* Outer glow halo */}
        <path d={arcPath(startDeg, endDeg, R)} fill="none"
          stroke={dimColor} strokeWidth="18" strokeLinecap="round" />

        {/* Track base */}
        <path d={arcPath(startDeg, endDeg, R)} fill="none"
          stroke="rgba(60,40,10,0.1)" strokeWidth="8" strokeLinecap="round" />

        {/* Red zone (top 15%) */}
        <path d={arcPath(startDeg + sweep * 0.85, endDeg, R)} fill="none"
          stroke="rgba(220,60,30,0.18)" strokeWidth="8" strokeLinecap="round" />

        {/* Active fill arc */}
        {clamp > 0 && (
          <path d={arcPath(startDeg, fillDeg, R)} fill="none"
            stroke={activeColor} strokeWidth="8" strokeLinecap="round"
            style={{
              transition: "all 0.65s cubic-bezier(0.34,1.56,0.64,1)",
              filter: `drop-shadow(0 0 5px ${glowColor})`,
            }} />
        )}

        {/* Minor ticks */}
        {minorTicks.map(({ outer, inner, pct }) => (
          <line key={pct} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
            stroke="rgba(80,55,15,0.18)" strokeWidth="1" strokeLinecap="round" />
        ))}

        {/* Major ticks */}
        {ticks.map(({ outer, inner, pct }) => (
          <line key={pct} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
            stroke="rgba(80,55,15,0.3)"
            strokeWidth={pct === 0 || pct === 100 ? 2.5 : 1.8}
            strokeLinecap="round" />
        ))}

        {/* dB labels — serif */}
        {dbLabels.map(({ pct, label: lbl }) => {
          const deg = startDeg + (pct / 100) * sweep;
          const pt  = arcPt(deg, R + 16);
          return (
            <text key={pct} x={pt.x} y={pt.y + 3}
              textAnchor="middle" fontSize="8"
              fill="rgba(80,55,15,0.38)"
              fontFamily={SERIF} fontStyle="italic">{lbl}</text>
          );
        })}

        {/* Needle */}
        <line x1={cx} y1={cy} x2={needlePt.x} y2={needlePt.y}
          stroke={activeColor} strokeWidth="2.5" strokeLinecap="round"
          style={{
            transition: "all 0.65s cubic-bezier(0.34,1.56,0.64,1)",
            filter: `drop-shadow(0 0 3px ${glowColor})`,
          }} />

        {/* Pivot */}
        <circle cx={cx} cy={cy} r="7" fill={activeColor}
          style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }} />
        <circle cx={cx} cy={cy} r="4" fill="rgba(255,248,235,0.95)" />
        <circle cx={cx} cy={cy} r="2" fill={activeColor} />

        {/* Label — serif, italic */}
        <text x={cx} y={cy - R - 6}
          textAnchor="middle" fontSize="10"
          fill="rgba(80,55,15,0.35)"
          fontFamily={SERIF} fontStyle="italic" letterSpacing="1.5">{label}</text>
      </svg>

      {/* Reading beneath meter */}
      <div className="-mt-1 flex items-baseline gap-1">
        <span style={{
          fontFamily: SERIF,
          fontSize: "18px",
          fontWeight: 500,
          fontStyle: "italic",
          color: activeColor,
          textShadow: `0 0 12px ${glowColor}`,
          lineHeight: 1,
          transition: "color 0.5s, text-shadow 0.5s",
        }}>
          {connected ? `${Math.round(clamp)}` : "—"}
        </span>
        {connected && (
          <span style={{ fontFamily: SERIF, fontSize: "11px", fontStyle: "italic", color: "rgba(232,160,32,0.65)" }}>
            %
          </span>
        )}
        {!connected && (
          <span className="font-mono text-[10px] tracking-widest" style={{ color: "#FF5533" }}>
            NO SIGNAL
          </span>
        )}
      </div>
    </div>
  );
}
