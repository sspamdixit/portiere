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
  const R = 74;
  const startDeg = -210;
  const sweep = 240;
  const endDeg = startDeg + sweep;
  const fillDeg = startDeg + (clamp / 100) * sweep;

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

  const activeColor = connected ? "#32CD32" : "#FF5533";
  const dimColor = connected ? "rgba(50,205,50,0.18)" : "rgba(255,85,51,0.18)";
  const glowColor = connected ? "rgba(50,205,50,0.5)" : "rgba(255,85,51,0.5)";

  const needlePt = arcPt(fillDeg, R - 10);

  const ticks = [0, 25, 50, 75, 100].map(pct => {
    const deg = startDeg + (pct / 100) * sweep;
    return { outer: arcPt(deg, R - 1), inner: arcPt(deg, R - 11), pct };
  });

  const minorTicks = [12.5, 37.5, 62.5, 87.5].map(pct => {
    const deg = startDeg + (pct / 100) * sweep;
    return { outer: arcPt(deg, R - 1), inner: arcPt(deg, R - 7), pct };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="122" viewBox="0 0 200 122">
        {/* Glow halo behind track */}
        <path
          d={arcPath(startDeg, endDeg, R)}
          fill="none"
          stroke={dimColor}
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Track background */}
        <path
          d={arcPath(startDeg, endDeg, R)}
          fill="none"
          stroke="rgba(0,0,0,0.09)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Active fill */}
        {clamp > 0 && (
          <path
            d={arcPath(startDeg, fillDeg, R)}
            fill="none"
            stroke={activeColor}
            strokeWidth="8"
            strokeLinecap="round"
            style={{
              transition: "all 0.65s cubic-bezier(0.34,1.56,0.64,1)",
              filter: `drop-shadow(0 0 4px ${glowColor})`,
            }}
          />
        )}
        {/* Minor ticks */}
        {minorTicks.map(({ outer, inner, pct }) => (
          <line
            key={pct}
            x1={outer.x} y1={outer.y}
            x2={inner.x} y2={inner.y}
            stroke="rgba(0,0,0,0.13)"
            strokeWidth="1"
            strokeLinecap="round"
          />
        ))}
        {/* Major ticks */}
        {ticks.map(({ outer, inner, pct }) => (
          <line
            key={pct}
            x1={outer.x} y1={outer.y}
            x2={inner.x} y2={inner.y}
            stroke="rgba(0,0,0,0.22)"
            strokeWidth={pct === 0 || pct === 100 ? 2 : 1.5}
            strokeLinecap="round"
          />
        ))}
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={needlePt.x} y2={needlePt.y}
          stroke={activeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            transition: "all 0.65s cubic-bezier(0.34,1.56,0.64,1)",
            filter: `drop-shadow(0 0 3px ${glowColor})`,
          }}
        />
        {/* Pivot */}
        <circle cx={cx} cy={cy} r="7" fill={activeColor}
          style={{ filter: `drop-shadow(0 0 5px ${glowColor})` }} />
        <circle cx={cx} cy={cy} r="4" fill="white" />
        <circle cx={cx} cy={cy} r="2" fill={activeColor} />
        {/* Range labels */}
        <text
          x={arcPt(startDeg, R + 14).x} y={arcPt(startDeg, R + 14).y}
          textAnchor="middle" fontSize="8.5" fill="rgba(0,0,0,0.35)"
          fontFamily="'JetBrains Mono', Consolas, monospace">0</text>
        <text
          x={arcPt(endDeg, R + 14).x} y={arcPt(endDeg, R + 14).y}
          textAnchor="middle" fontSize="8.5" fill="rgba(0,0,0,0.35)"
          fontFamily="'JetBrains Mono', Consolas, monospace">100</text>
        {/* Label */}
        <text
          x={cx} y={cy - R - 8}
          textAnchor="middle" fontSize="7.5"
          fill="rgba(0,0,0,0.28)"
          fontFamily="'JetBrains Mono', Consolas, monospace"
          letterSpacing="2.5">{label}</text>
      </svg>
      <div
        className="text-[12px] font-mono font-bold tracking-widest -mt-1"
        style={{ color: activeColor, textShadow: `0 0 10px ${glowColor}` }}
      >
        {connected ? `${Math.round(clamp)}%` : "NO SIGNAL"}
      </div>
    </div>
  );
}
