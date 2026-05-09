import { useEffect, useRef, useState } from "react";

interface VoiceOrbProps {
  active: boolean;
  listening: boolean;
  size?: number;
}

export default function VoiceOrb({ active, listening, size = 160 }: VoiceOrbProps) {
  const [rings, setRings] = useState<number[]>([]);
  const idRef = useRef(0);
  const prevActive = useRef(false);

  useEffect(() => {
    if (active && !prevActive.current) {
      const id = ++idRef.current;
      setRings(prev => [...prev, id, id + 1000, id + 2000]);
      const t = setTimeout(() => setRings(prev => prev.filter(r => r !== id && r !== id + 1000 && r !== id + 2000)), 1800);
      return () => clearTimeout(t);
    }
    prevActive.current = active;
  }, [active]);

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size + 60, height: size + 60 }}
    >
      {/* Sonar rings — emitted outward on activation */}
      {rings.map((id, i) => (
        <div
          key={id}
          className="absolute rounded-full pointer-events-none sonar-ring"
          style={{
            width: size,
            height: size,
            animationDelay: `${(i % 3) * 0.22}s`,
          }}
        />
      ))}

      {/* Ambient glow halo */}
      <div
        className="absolute rounded-full pointer-events-none transition-all duration-700"
        style={{
          width: size + 52,
          height: size + 52,
          background: listening
            ? "radial-gradient(circle, rgba(50,205,50,0.25) 0%, rgba(50,205,50,0.05) 55%, transparent 75%)"
            : "radial-gradient(circle, rgba(0,212,255,0.14) 0%, transparent 65%)",
          filter: "blur(10px)",
        }}
      />

      {/* The orb */}
      <div
        className="relative rounded-full select-none flex-shrink-0"
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(circle at 37% 30%, rgba(210,255,210,0.97) 0%, rgba(80,220,80,0.85) 26%, rgba(20,170,20,0.68) 56%, rgba(5,90,5,0.38) 100%)",
          backdropFilter: "blur(22px) saturate(1.9)",
          WebkitBackdropFilter: "blur(22px) saturate(1.9)",
          border: "1.5px solid rgba(255,255,255,0.88)",
          boxShadow: [
            "0 0 0 1.5px rgba(255,255,255,0.28)",
            "0 10px 40px rgba(0,0,0,0.16)",
            "0 2px 8px rgba(0,0,0,0.1)",
            "inset 0 2.5px 1.5px rgba(255,255,255,0.92)",
            "inset 0 -8px 24px rgba(0,110,0,0.14)",
          ].join(", "),
          overflow: "hidden",
        }}
      >
        {/* Primary specular — top-left bright */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "6%",
            left: "9%",
            width: "44%",
            height: "42%",
            background:
              "radial-gradient(ellipse at 38% 32%, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.58) 42%, transparent 100%)",
            borderRadius: "50%",
            transform: "rotate(-22deg)",
          }}
        />
        {/* Edge diffusion glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 62% 70%, rgba(150,255,150,0.28) 0%, transparent 55%)",
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
              "radial-gradient(ellipse, rgba(255,255,255,0.32) 0%, transparent 100%)",
            borderRadius: "50%",
          }}
        />
        {/* Listening pulse */}
        {listening && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none orb-pulse"
            style={{
              background:
                "radial-gradient(circle at center, rgba(50,205,50,0.4) 0%, transparent 65%)",
            }}
          />
        )}
      </div>
    </div>
  );
}
