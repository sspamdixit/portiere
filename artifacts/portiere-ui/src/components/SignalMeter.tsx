const SERIF = "'Cormorant Garamond', Georgia, serif";

interface SignalMeterProps {
  value: number;
  connected: boolean;
  label?: string;
}

export default function SignalMeter({ value, connected, label = "SIGNAL" }: SignalMeterProps) {
  const clamp  = Math.max(0, Math.min(100, value));
  const toRad  = (deg: number) => (deg * Math.PI) / 180;

  const cx = 100, cy = 108, R = 74;
  const startDeg = -210, sweep = 240, endDeg = startDeg + sweep;
  const fillDeg  = startDeg + (clamp / 100) * sweep;

  function arcPt(deg: number, r: number) {
    const a = toRad(deg);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }
  function arcPath(from: number, to: number, r: number): string {
    const s = arcPt(from, r), e = arcPt(to, r);
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  }

  const activeColor = connected ? "#E8A020" : "#FF5533";
  const dimColor    = connected ? "rgba(232,160,32,0.14)" : "rgba(255,85,51,0.14)";
  const glowColor   = connected ? "rgba(232,160,32,0.58)" : "rgba(255,85,51,0.5)";
  const needlePt    = arcPt(fillDeg, R - 10);

  const ticks = [0, 25, 50, 75, 100].map(pct => {
    const deg = startDeg + (pct / 100) * sweep;
    return { outer: arcPt(deg, R - 1), inner: arcPt(deg, R - 12), pct };
  });
  const minorTicks = [12.5, 37.5, 62.5, 87.5].map(pct => {
    const deg = startDeg + (pct / 100) * sweep;
    return { outer: arcPt(deg, R - 1), inner: arcPt(deg, R - 7), pct };
  });

  // dB-style labels like a real VU meter (serif italic)
  const dbLabels = [
    { pct: 0,   text: "−∞" },
    { pct: 40,  text: "−3" },
    { pct: 60,  text: "0"  },
    { pct: 85,  text: "+3" },
    { pct: 100, text: "+6" },
  ];

  return (
    <div className="flex flex-col items-center">

      {/* Backlit faceplate window */}
      <div style={{
        position: "relative",
        padding: "5px 10px 1px",
        background: [
          "linear-gradient(180deg,",
          "  rgba(250,228,168,0.38) 0%,",
          "  rgba(255,238,190,0.25) 45%,",
          "  rgba(242,208,110,0.32) 100%)"
        ].join(""),
        border: "1px solid rgba(195,158,68,0.42)",
        borderRadius: "4px",
        boxShadow: [
          "inset 0 1.5px 0 rgba(255,248,215,0.65)",
          "inset 0 -1.5px 0 rgba(140,100,20,0.22)",
          "0 0 22px rgba(232,160,32,0.1)",
          "0 0 0 3px rgba(232,160,32,0.04)",
        ].join(", "),
      }}>
        {/* VU badge — top-left corner */}
        <div style={{
          position: "absolute",
          top: 4, left: 7,
          fontSize: "7.5px",
          fontFamily: SERIF,
          fontStyle: "italic",
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: "rgba(140,100,22,0.55)",
          userSelect: "none",
        }}>VU</div>

        {/* dB indicator dot — top-right */}
        <div style={{
          position: "absolute",
          top: 5, right: 7,
          width: 5, height: 5,
          borderRadius: "50%",
          background: connected ? `radial-gradient(circle at 35% 30%, rgba(255,220,80,0.9) 0%, ${activeColor} 60%)` : "rgba(180,140,60,0.3)",
          boxShadow: connected ? `0 0 6px ${glowColor}` : "none",
          transition: "all 0.5s ease",
        }} />

        <svg width="200" height="122" viewBox="0 0 200 122">
          {/* Glow halo */}
          <path d={arcPath(startDeg, endDeg, R)} fill="none"
            stroke={dimColor} strokeWidth="18" strokeLinecap="round" />
          {/* Track */}
          <path d={arcPath(startDeg, endDeg, R)} fill="none"
            stroke="rgba(60,40,8,0.1)" strokeWidth="8" strokeLinecap="round" />
          {/* Red zone (top 15%) — subtle */}
          <path d={arcPath(startDeg + sweep * 0.85, endDeg, R)} fill="none"
            stroke="rgba(200,50,20,0.16)" strokeWidth="8" strokeLinecap="round" />
          {/* Active fill */}
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
              stroke="rgba(80,55,12,0.18)" strokeWidth="1" strokeLinecap="round" />
          ))}
          {/* Major ticks */}
          {ticks.map(({ outer, inner, pct }) => (
            <line key={pct} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
              stroke="rgba(80,55,12,0.3)"
              strokeWidth={pct === 0 || pct === 100 ? 2.5 : 1.8}
              strokeLinecap="round" />
          ))}
          {/* dB labels — serif italic */}
          {dbLabels.map(({ pct, text }) => {
            const deg = startDeg + (pct / 100) * sweep;
            const pt  = arcPt(deg, R + 16);
            return (
              <text key={pct} x={pt.x} y={pt.y + 3}
                textAnchor="middle" fontSize="8"
                fill="rgba(90,62,14,0.42)"
                fontFamily={SERIF} fontStyle="italic">{text}</text>
            );
          })}
          {/* Needle */}
          <line x1={cx} y1={cy} x2={needlePt.x} y2={needlePt.y}
            stroke={activeColor} strokeWidth="2.5" strokeLinecap="round"
            style={{
              transition: "all 0.65s cubic-bezier(0.34,1.56,0.64,1)",
              filter: `drop-shadow(0 0 3.5px ${glowColor})`,
            }} />
          {/* Pivot */}
          <circle cx={cx} cy={cy} r="7" fill={activeColor}
            style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }} />
          <circle cx={cx} cy={cy} r="4" fill="rgba(255,248,228,0.95)" />
          <circle cx={cx} cy={cy} r="2" fill={activeColor} />
          {/* Label — serif italic */}
          <text x={cx} y={cy - R - 6}
            textAnchor="middle" fontSize="10"
            fill="rgba(90,62,14,0.35)"
            fontFamily={SERIF} fontStyle="italic" letterSpacing="1.5">{label}</text>
        </svg>
      </div>

      {/* Reading */}
      <div className="-mt-1 flex items-baseline gap-1">
        <span style={{
          fontFamily: SERIF,
          fontSize: "19px",
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
          <span style={{ fontFamily: SERIF, fontSize: "11px", fontStyle: "italic", color: "rgba(232,160,32,0.6)" }}>
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
