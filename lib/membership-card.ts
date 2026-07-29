import { readFile } from "node:fs/promises";
import path from "node:path";

// Membership card composition (T-048, CR-0009 §3.5).
//
// The client supplied the artwork; we only fill it in. The blank PNG is embedded
// as a data URI inside an SVG and the six fields are drawn on top, so the output
// is a single self-contained file with no runtime image dependency and no native
// image library to install.
//
// It is rendered SERVER-SIDE and served through an authorized route. Doing it in
// the browser would mean shipping the blank template plus the member's data to
// the client, which makes forging a card trivial: anyone could redraw the same
// template with any name on it and it would be pixel-identical to a real one.

/** Natural size of the supplied artwork, in px. */
export const CARD_WIDTH = 1841;
export const CARD_HEIGHT = 1161;

export type CardData = {
  fullName: string;
  gender: string | null;
  stateName: string;
  lgaName: string;
  wardNumber: number;
  membershipNumber: string;
};

let blankCache: string | null = null;

async function blankTemplateDataUri(): Promise<string> {
  if (blankCache) return blankCache;
  const file = path.join(process.cwd(), "public", "cards", "membership-card-blank.png");
  const bytes = await readFile(file);
  blankCache = `data:image/png;base64,${bytes.toString("base64")}`;
  return blankCache;
}

// SVG is XML: an unescaped & or < in a member's name would produce a corrupt
// document rather than a wrong-looking card, so this is correctness, not polish.
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Field geometry. The label baselines were MEASURED off the blank PNG by scanning
// the label column for dark glyph bands, rather than eyeballed, so the values sit
// on the same baseline as the labels the artwork already draws. Re-measure if the
// client ever supplies new artwork.
//   NAME: 243   GENDER: 371   STATE: 504   L.G: 637   WARD: 770
const VALUE_X = 1180;
const ROWS_Y = [243, 371, 504, 637, 770];
const ROW_FONT = 62;

// How much room a value has before it would run into the card's right edge and
// the watermark behind it.
const VALUE_MAX_W = CARD_WIDTH - VALUE_X - 70;

// Code strip geometry, and the room the number has before the signature block.
const CODE_X = 270;
const CODE_Y = 1035;
const CODE_FONT = 54;
const CODE_MAX_W = 620;

// Width per character as a fraction of font size. MEASURED off a real render
// rather than guessed: "Okesooto Olanrewaju" (19 chars at 62px) spans ~545px,
// giving ~0.46. 0.50 leaves a small safety margin without shrinking ordinary
// names for no reason, which an earlier 0.56 guess did.
const SANS_RATIO = 0.5;
const MONO_RATIO = 0.62;

/** Smallest we will shrink a value before truncating it instead. */
const MIN_ROW_FONT = 24;
const MIN_CODE_FONT = 30;

type Fitted = { fontSize: number; text: string; textLength?: number };

/**
 * Fit a value into `maxWidth` (CR-0009 follow-up: long names must not overflow
 * the card or run over the watermark).
 *
 * Three stages, in order of how well they preserve the value:
 *   1. Use the full size if it already fits.
 *   2. Shrink the font until it fits, down to a floor that is still legible in
 *      print. This handles every realistic Nigerian name.
 *   3. Only past that floor, truncate with an ellipsis.
 *
 * TRUNCATION IS THE GUARANTEE, not `textLength`. The first version of this relied
 * on `textLength` + `lengthAdjust` to compress overlong text, which is valid SVG
 * and which browsers honour, but the macOS renderer ignored it outright and the
 * name ran off the card. Members download this file and open it in whatever they
 * have, so correctness cannot depend on optional renderer features. `textLength`
 * is still emitted when we truncate, so renderers that do honour it land exactly
 * on the boundary, but the output is already within budget without it.
 */
export function fitText(
  value: string,
  maxWidth: number,
  baseFont: number,
  minFont: number,
  ratio: number,
): Fitted {
  const width = (chars: number, font: number) => chars * font * ratio;

  if (width(value.length, baseFont) <= maxWidth) return { fontSize: baseFont, text: value };

  const scaled = Math.floor(maxWidth / (value.length * ratio));
  if (scaled >= minFont) return { fontSize: scaled, text: value };

  const maxChars = Math.floor(maxWidth / (minFont * ratio));
  if (value.length <= maxChars) return { fontSize: minFont, text: value };

  const text = value.slice(0, Math.max(1, maxChars - 1)).trimEnd() + "\u2026";
  return { fontSize: minFont, text, textLength: maxWidth };
}

function textEl(x: number, y: number, cls: string, fit: Fitted): string {
  const length = fit.textLength
    ? ` textLength="${fit.textLength}" lengthAdjust="spacingAndGlyphs"`
    : "";
  return `<text x="${x}" y="${y}" class="${cls}" font-size="${fit.fontSize}"${length}>${xml(fit.text)}</text>`;
}

export function renderCardSvg(data: CardData, blankDataUri: string): string {
  const values = [
    data.fullName,
    data.gender ? data.gender[0].toUpperCase() + data.gender.slice(1) : "",
    data.stateName,
    data.lgaName,
    String(data.wardNumber),
  ];

  const rows = values
    .map((v, i) =>
      v
        ? textEl(VALUE_X, ROWS_Y[i], "v", fitText(v, VALUE_MAX_W, ROW_FONT, MIN_ROW_FONT, SANS_RATIO))
        : "",
    )
    .filter(Boolean)
    .join("\n    ");

  const code = textEl(
    CODE_X,
    CODE_Y,
    "code",
    fitText(data.membershipNumber, CODE_MAX_W, CODE_FONT, MIN_CODE_FONT, MONO_RATIO),
  );

  // The membership number sits in the dark footer strip, beside the "Code" label.
  // Font sizes are per-element (set by fitText) rather than in the stylesheet, so
  // one long field shrinks alone instead of dragging the others down with it.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <style>
    .v { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 700; fill: #3f3f46; }
    .code { font-family: "Courier New", Courier, monospace; font-weight: 700; fill: #ffffff; letter-spacing: 1px; }
  </style>
  <image href="${blankDataUri}" x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" />
  <g>
    ${rows}
  </g>
  ${code}
</svg>`;
}

export async function buildMembershipCard(data: CardData): Promise<string> {
  return renderCardSvg(data, await blankTemplateDataUri());
}

/** Filename a member gets when they download. Safe for any filesystem. */
export function cardFileName(membershipNumber: string): string {
  return `${membershipNumber.replace(/[^A-Za-z0-9-]/g, "")}-membership-card.svg`;
}
