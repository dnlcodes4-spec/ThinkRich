/*
  Branded PLACEHOLDER marks for the ThinkRich arms, until the client supplies the real
  logos. Each is a navy chip with the arm's monogram in gold — intentional, on-brand, and
  clearly a placeholder (not a grey box). Swap for real logos when they arrive (T-016).
*/

export function ArmMark({
  abbr,
  className = "",
}: {
  abbr: string;
  className?: string;
}) {
  return (
    <div
      className={`relative grid aspect-square place-items-center overflow-hidden rounded-2xl border border-gold-400/25 bg-navy-900 ${className}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(70% 70% at 30% 20%, rgba(201,162,39,0.16), transparent 60%)",
        }}
      />
      <span className="relative font-display text-lg font-black tracking-tight text-gold-400">
        {abbr}
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-2 right-2 text-[8px] font-semibold uppercase tracking-wider text-navy-50/25"
      >
        logo
      </span>
    </div>
  );
}

// The umbrella wordmark placeholder (ThinkRich Community).
export function ThinkRichWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-lg font-semibold tracking-tight ${className}`}>
      Think<span className="text-gold-400">Rich</span>
    </span>
  );
}
