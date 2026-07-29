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
        ? `<text x="${VALUE_X}" y="${ROWS_Y[i]}" class="v">${xml(v)}</text>`
        : "",
    )
    .join("\n    ");

  // The membership number sits in the dark footer strip, beside the "Code" label.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <style>
    .v { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: ${ROW_FONT}px; font-weight: 700; fill: #3f3f46; }
    .code { font-family: "Courier New", Courier, monospace; font-size: 54px; font-weight: 700; fill: #ffffff; letter-spacing: 1px; }
  </style>
  <image href="${blankDataUri}" x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" />
  <g>
    ${rows}
  </g>
  <text x="270" y="1035" class="code">${xml(data.membershipNumber)}</text>
</svg>`;
}

export async function buildMembershipCard(data: CardData): Promise<string> {
  return renderCardSvg(data, await blankTemplateDataUri());
}

/** Filename a member gets when they download. Safe for any filesystem. */
export function cardFileName(membershipNumber: string): string {
  return `${membershipNumber.replace(/[^A-Za-z0-9-]/g, "")}-membership-card.svg`;
}
