import Image from "next/image";

/*
  The arms' brand marks. Each logo sits on a shared rounded tile so a
  heterogeneous set (green, navy, red, gold) reads as one system, and the tile
  works on both the white index and the dark detail header. Tone adjusts the
  tile ground to the logo it holds:
    - plain: white, for the full-colour logos on white grounds.
    - warm:  a faint gold wash, to lift the $M Club's thin gold linework.
    - navy:  the Think-Winners navy, so its gold mark reads exactly as it does in
             the dashboard (gold on navy), instead of gold-on-white going faint.
*/
type Tone = "plain" | "warm" | "navy";

const TILE: Record<Tone, string> = {
  plain: "bg-white ring-ink-100",
  warm: "ring-gold-200/70",
  navy: "bg-navy-700 ring-navy-600",
};

export function ArmMark({
  logo,
  abbr,
  name,
  tone = "plain",
  className = "",
}: {
  logo?: string;
  abbr: string;
  name?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={`relative grid aspect-square place-items-center overflow-hidden rounded-2xl ring-1 ${TILE[tone]} ${className}`}
      style={
        tone === "warm"
          ? { background: "radial-gradient(92% 92% at 50% 32%, var(--color-gold-100), var(--color-gold-50))" }
          : undefined
      }
    >
      {logo ? (
        <Image src={logo} alt={name ? `${name} logo` : ""} fill sizes="64px" className="object-contain p-1.5" />
      ) : (
        <>
          <span className="font-display text-base font-black tracking-tight text-navy-700">{abbr}</span>
          <span aria-hidden="true" className="absolute bottom-2 h-0.5 w-5 rounded-full bg-gold-500" />
        </>
      )}
    </div>
  );
}
