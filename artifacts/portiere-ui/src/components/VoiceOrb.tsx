import { useEffect, useRef, useState } from "react";

interface VoiceOrbProps {
  active: boolean;
  listening: boolean;
  size?: number;
}

/** Tick mark positions around the bezel ring */
const BEZEL_TICKS = [0, 45, 90, 135, 180, 225, 270, 315];

export default function VoiceOrb({ active, listening, size = 160 }: VoiceOrbProps) {
  const [rings, setRings] = useState<number[]>([]);
  const idRef      = useRef(0);
  const prevActive = useRef(false);

  useEffect(() => {
    if (active && !prevActive.current) {
      const id = ++idRef.current;
      setRings(prev => [...prev, id, id + 1000, id + 2000]);
      const t = setTimeout(
        () => setRings(prev => prev.filter(r => r !== id && r !== id + 1000 && r !== id + 2000)),
        1900,
      );
      return () => clearTimeout(t);
    }
    prevActive.current = active;
  }, [active]);

  const bezelR = size + 22;

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size + 60, height: size + 60 }}
    >
      {/* Amber sonar rings */}
      {rings.map((id, i) => (
        <div
          key={id}
          className="absolute rounded-full pointer-events-none sonar-ring-amber"
          style={{ width: size, height: size, animationDelay: `${(i % 3) * 0.22}s` }}
        />
      ))}

      {/* Ambient warm halo */}
      <div className="absolute rounded-full pointer-events-none transition-all duration-700" style={{
        width: size + 56,
        height: size + 56,
        background: listening
          ? "radial-gradient(circle, rgba(232,160,32,0.3) 0%, rgba(200,100,20,0.1) 55%, transparent 75%)"
          : "radial-gradient(circle, rgba(200,145,40,0.16) 0%, transparent 65%)",
        filter: "blur(12px)",
      }} />

      {/* ── Physical bezel / mounting ring ─────────── */}
      <div className="absolute rounded-full pointer-events-none" style={{
        width: bezelR,
        height: bezelR,
        background: [
          "radial-gradient(circle at 35% 28%,",
          "  rgba(248,220,140,0.82) 0%,",
          "  rgba(190,148,62,0.68) 38%,",
          "  rgba(128,92,28,0.58) 68%,",
          "  rgba(80,52,14,0.45) 100%)"
        ].join(""),
        border: "1.5px solid rgba(175,138,52,0.5)",
        boxShadow: [
          "inset 0 2.5px 0 rgba(255,242,172,0.5)",
          "inset 0 -2.5px 0 rgba(80,50,8,0.35)",
          "inset 2.5px 0 0 rgba(255,242,172,0.3)",
          "inset -2.5px 0 0 rgba(80,50,8,0.22)",
          "0 4px 16px rgba(80,40,0,0.2)",
          "0 0 0 1px rgba(200,160,65,0.2)",
        ].join(", "),
      }} />

      {/* Bezel tick marks */}
      {BEZEL_TICKS.map(angle => {
        const rad = (angle - 90) * (Math.PI / 180);
        const outerR = bezelR / 2;
        const isMajor = angle % 90 === 0;
        const tickLen = isMajor ? 7 : 4;
        const x1 = Math.cos(rad) * (outerR - 3);
        const y1 = Math.sin(rad) * (outerR - 3);
        const x2 = Math.cos(rad) * (outerR - 3 - tickLen);
        const y2 = Math.sin(rad) * (outerR - 3 - tickLen);
        return (
          <svg
            key={angle}
            className="absolute pointer-events-none"
            style={{ width: bezelR, height: bezelR, left: (size + 60 - bezelR) / 2, top: (size + 60 - bezelR) / 2 }}
            viewBox={`${-bezelR / 2} ${-bezelR / 2} ${bezelR} ${bezelR}`}
          >
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={`rgba(90,58,12,${isMajor ? 0.6 : 0.35})`}
              strokeWidth={isMajor ? 1.5 : 1}
              strokeLinecap="round"
            />
          </svg>
        );
      })}

      {/* ── The orb ────────────────────────────────── */}
      <div className="relative rounded-full select-none flex-shrink-0" style={{
        width: size,
        height: size,
        background: [
          "radial-gradient(circle at 37% 30%,",
          "  rgba(255,238,165,0.98) 0%,",
          "  rgba(242,172,42,0.9) 24%,",
          "  rgba(202,112,16,0.74) 55%,",
          "  rgba(112,58,6,0.44) 100%)"
        ].join(""),
        backdropFilter: "blur(20px) saturate(1.9)",
        WebkitBackdropFilter: "blur(20px) saturate(1.9)",
        border: "1.5px solid rgba(255,238,168,0.85)",
        boxShadow: [
          "0 0 0 1.5px rgba(255,218,115,0.28)",
          "0 10px 40px rgba(80,40,0,0.18)",
          "inset 0 2.5px 1.5px rgba(255,248,195,0.92)",
          "inset 0 -8px 24px rgba(140,62,0,0.16)",
        ].join(", "),
        overflow: "hidden",
      }}>
        {/* Primary specular */}
        <div className="absolute pointer-events-none" style={{
          top: "6%", left: "9%", width: "44%", height: "42%",
          background: "radial-gradient(ellipse at 38% 32%, rgba(255,255,255,0.97) 0%, rgba(255,248,210,0.6) 42%, transparent 100%)",
          borderRadius: "50%",
          transform: "rotate(-22deg)",
        }} />
        {/* Warm inner glow */}
        <div className="absolute pointer-events-none" style={{
          inset: 0, borderRadius: "50%",
          background: "radial-gradient(circle at 60% 68%, rgba(240,160,40,0.3) 0%, transparent 55%)",
        }} />
        {/* Secondary reflection */}
        <div className="absolute pointer-events-none" style={{
          bottom: "11%", right: "13%", width: "24%", height: "19%",
          background: "radial-gradient(ellipse, rgba(255,245,210,0.35) 0%, transparent 100%)",
          borderRadius: "50%",
        }} />
        {listening && (
          <div className="absolute inset-0 rounded-full pointer-events-none orb-pulse" style={{
            background: "radial-gradient(circle at center, rgba(255,180,40,0.45) 0%, transparent 65%)",
          }} />
        )}
      </div>
    </div>
  );
}
