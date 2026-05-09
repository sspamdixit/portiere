// Warm amber VU bars — vintage analog audio aesthetic (Panasonic/Pioneer style)
const ANIMS = ["vu-a", "vu-b", "vu-c", "vu-d", "vu-e", "vu-f", "vu-g"] as const;
const DURS  = [0.45, 0.52, 0.38, 0.60, 0.43, 0.55, 0.48];
const DELS  = [0, 0.04, 0.09, 0.02, 0.07, 0.12, 0.05];

interface VUBarsProps {
  active: boolean;
  count?: number;
  height?: number;
}

export default function VUBars({ active, count = 7, height = 100 }: VUBarsProps) {
  return (
    <div className="flex gap-[3px] items-end" style={{ height }}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: active ? undefined : "16%",
            minHeight: 4,
            borderRadius: "2px",
            alignSelf: "flex-end",
            // Amber at bottom → warm orange in mid → red at clip — authentic VU meter palette
            background: active
              ? "linear-gradient(to top, #E8A020 0%, #E8A020 52%, #F07010 70%, #E84020 88%, #CC2020 100%)"
              : "rgba(200,140,30,0.18)",
            boxShadow: active
              ? "0 0 6px rgba(232,160,32,0.5), 0 0 1px rgba(232,160,32,0.8)"
              : "none",
            animation: active
              ? `${ANIMS[i % ANIMS.length]} ${DURS[i % DURS.length]}s ease-in-out ${DELS[i % DELS.length]}s infinite alternate`
              : undefined,
            transition: "background 0.3s ease, box-shadow 0.28s ease",
          }}
        />
      ))}
    </div>
  );
}
