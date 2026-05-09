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
            background: active
              ? "linear-gradient(to top, #32CD32 0%, #32CD32 58%, #FFCC00 76%, #FF4444 100%)"
              : "rgba(50,205,50,0.16)",
            boxShadow: active ? "0 0 5px rgba(50,205,50,0.45)" : "none",
            animation: active
              ? `${ANIMS[i % ANIMS.length]} ${DURS[i % DURS.length]}s ease-in-out ${DELS[i % DELS.length]}s infinite alternate`
              : undefined,
            transition: "background 0.28s ease, box-shadow 0.28s ease",
          }}
        />
      ))}
    </div>
  );
}
