import Image from "next/image";

/*
  The real ThinkRich Community logo (T-016). Both assets are derived from the
  client's `ThinkrichCommunity_transparent.png`; see public/logos/CREDITS.md for
  the exact recipe.

  Two lockups, because one asset cannot do both jobs:

  - `<ThinkRichLogo>` pairs the striding figure with LIVE TEXT. The supplied
    lockup sets its name in a blackletter script that turns to mush below about
    120px wide, and baking a name into an image costs us selectable, translatable,
    screen-reader-native text. So small contexts get the mark plus real type.
  - `<ThinkRichLockup>` is the full supplied artwork, name and tagline included,
    for places with room to show the brand whole.

  The mark is 1.58:1, not square. It is sized by HEIGHT and left to find its own
  width; forcing it into a square box crushes the figure into the swoosh.

  Both assets are re-derived, not used raw. The supplied PNG carries a 1px pale
  yellow frame baked into its edges, which renders as a visible rectangle on any
  dark ground, and a wide empty margin inside that. Shaving the frame before
  trimming is what makes the transparency actually usable.
*/

/** Intrinsic pixel dimensions of the derived assets, so aspect never drifts. */
const MARK = { w: 630, h: 400 };
const LOCKUP = { w: 900, h: 754 };

/** The figure mark alone. Sized by height; width follows the artwork. */
export function ThinkRichMark({
  className = "",
  height = 32,
}: {
  className?: string;
  /** Rendered height in px. The mark stays legible down to ~28. */
  height?: number;
}) {
  return (
    <Image
      src="/logos/thinkrich-mark.png"
      alt=""
      aria-hidden="true"
      width={Math.round((height * MARK.w) / MARK.h)}
      height={height}
      className={className}
    />
  );
}

/**
 * Mark + live wordmark. The default lockup for navs and compact footers.
 * The accessible name comes from the text, so the mark is decorative.
 */
export function ThinkRichLogo({
  className = "",
  textClassName = "",
  height = 32,
}: {
  className?: string;
  textClassName?: string;
  height?: number;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <ThinkRichMark height={height} />
      <span
        className={`font-display font-semibold tracking-tight ${textClassName}`}
      >
        Think<span className="text-green-400">Rich</span> Community
      </span>
    </span>
  );
}

/**
 * The full supplied artwork: figure, name, and the "Creating Value for Mankind"
 * tagline. Anywhere this appears, do not repeat that tagline in adjacent copy.
 */
export function ThinkRichLockup({
  className = "",
  width = 260,
}: {
  className?: string;
  width?: number;
}) {
  return (
    <Image
      src="/logos/thinkrich-lockup.png"
      alt="ThinkRich Community: Creating Value for Mankind"
      width={width}
      height={Math.round((width * LOCKUP.h) / LOCKUP.w)}
      className={className}
    />
  );
}
