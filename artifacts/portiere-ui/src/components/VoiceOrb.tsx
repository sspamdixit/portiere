import { useEffect, useRef, useState } from "react";

interface VoiceOrbProps {
  active: boolean;
  listening: boolean;
  size?: number;
}

export default function VoiceOrb({ active, listening, size = 160 }: VoiceOrbProps) {
  const [rings, setRings] = useState<number[]>([]);
  const idRef      = useRef(0);
  const prevActive = useRef(false);

  useEffect(() => {
    if (active && !prevActive.current) {
      const id = ++idRef.current;
      // Three staggered rings
      setRings(prev => [...prev, id, id + 1000, id + 2000]);
      const t = setTimeout(
        () => setRings(prev => prev.filter(r => r !== id && r !== id + 1000 && r !== id + 2000)),
        1900,
      );
      return () => clearTimeout(t);
    }
    prevActive.current = active;
  }, [active]);

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size + 60, height: size + 60 }}
    >
      {/* Sonar rings — warm amber burst */}
      {rings.map((id, i) => (
        <div
          key={id}
          className="absolute rounded-full pointer-events-none sonar-ring-amber"
          style={{
            width: size,
            height: size,
            animationDelay: `${(i % 3) * 0.22}s`,
          }}
        />
      ))}

      {/* Ambient halo */}
      <div
        className="absolute rounded-full pointer-events-none transition-all duration-700"
        style={{
          width: size + 52,
          height: size + 52,
          background: listening
            ? "radial-gradient(circle, rgba(232,160,32,0.28) 0%, rgba(200,100,20,0.1) 55%, transparent 75%)"
            : "radial-gradient(circle, rgba(200,140,40,0.14) 0%, transparent 65%)",
          filter: "blur(12px)",
        }}
      />

      {/* The orb — warm amber glass, like a glowing indicator lamp */}
      <div
        className="relative rounded-full select-none flex-shrink-0"
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(circle at 37% 30%, rgba(255,235,160,0.98) 0%, rgba(240,170,40,0.88) 24%, rgba(200,110,15,0.72) 55%, rgba(110,55,5,0.42) 100%)",
          backdropFilter: "blur(20px) saturate(1.9)",
          WebkitBackdropFilter: "blur(20px) saturate(1.9)",
          border: "1.5px solid rgba(255,240,180,0.82)",
          boxShadow: [
            "0 0 0 1.5px rgba(255,220,120,0.25)",
            "0 10px 40px rgba(80,40,0,0.18)",
            "0 2px 8px rgba(0,0,0,0.12)",
            "inset 0 2.5px 1.5px rgba(255,248,200,0.92)",
            "inset 0 -8px 24px rgba(140,60,0,0.16)",
          ].join(", "),
          overflow: "hidden",
        }}
      >
        {/* Primary specular — top-left */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "6%",
            left: "9%",
            width: "44%",
            height: "42%",
            background:
              "radial-gradient(ellipse at 38% 32%, rgba(255,255,255,0.96) 0%, rgba(255,248,210,0.6) 42%, transparent 100%)",
            borderRadius: "50%",
            transform: "rotate(-22deg)",
          }}
        />
        {/* Warm inner glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 60% 68%, rgba(240,160,40,0.3) 0%, transparent 55%)",
          }}
        />
        {/* Secondary reflection — bottom-right */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: "11%",
            right: "13%",
            width: "24%",
            height: "19%",
            background:
              "radial-gradient(ellipse, rgba(255,245,210,0.35) 0%, transparent 100%)",
            borderRadius: "50%",
          }}
        />
        {/* Listening pulse */}
        {listening && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none orb-pulse"
            style={{
              background:
                "radial-gradient(circle at center, rgba(255,180,40,0.45) 0%, transparent 65%)",
            }}
          />
        )}
      </div>
    </div>
  );
}
