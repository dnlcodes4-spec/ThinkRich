import { describe, it, expect } from "vitest";
import { renderCardSvg, cardFileName, fitText, CARD_WIDTH, CARD_HEIGHT } from "./membership-card";

const BLANK = "data:image/png;base64,AAAA";

const base = {
  fullName: "Okesooto Olanrewaju",
  gender: "male",
  stateName: "Oyo",
  lgaName: "Ibadan South-West",
  wardNumber: 12,
  membershipNumber: "TWM-OG-01-000001",
};

describe("renderCardSvg", () => {
  it("draws all six fields onto the supplied artwork", () => {
    const svg = renderCardSvg(base, BLANK);
    expect(svg).toContain("Okesooto Olanrewaju");
    expect(svg).toContain("Male");
    expect(svg).toContain("Oyo");
    expect(svg).toContain("Ibadan South-West");
    expect(svg).toContain(">12<");
    expect(svg).toContain("TWM-OG-01-000001");
    expect(svg).toContain(BLANK);
  });

  it("keeps the artwork's natural size, so print scaling stays predictable", () => {
    const svg = renderCardSvg(base, BLANK);
    expect(svg).toContain(`width="${CARD_WIDTH}"`);
    expect(svg).toContain(`height="${CARD_HEIGHT}"`);
    expect(svg).toContain(`viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}"`);
  });

  it("escapes XML, so a name with & or < cannot corrupt the document", () => {
    const svg = renderCardSvg({ ...base, fullName: 'Ade & Sons <script>"x"' }, BLANK);
    expect(svg).toContain("Ade &amp; Sons &lt;script&gt;&quot;x&quot;");
    expect(svg).not.toContain("<script>");
  });

  it("title-cases the gender the enum stores lowercase", () => {
    expect(renderCardSvg({ ...base, gender: "female" }, BLANK)).toContain(">Female<");
  });

  it("leaves the GENDER line blank rather than printing 'null'", () => {
    const svg = renderCardSvg({ ...base, gender: null }, BLANK);
    expect(svg).not.toContain("null");
    expect(svg).toContain("Okesooto Olanrewaju");
  });
});

describe("cardFileName", () => {
  it("names the file after the membership number", () => {
    expect(cardFileName("TWM-OG-01-000001")).toBe("TWM-OG-01-000001-membership-card.svg");
  });

  it("strips anything that could escape a directory or break a filesystem", () => {
    expect(cardFileName("../../etc/passwd")).toBe("etcpasswd-membership-card.svg");
  });
});

describe("fitText", () => {
  const MAX = 600;
  const BASE = 62;
  const MIN = 34;
  const RATIO = 0.56;

  it("leaves a value that already fits completely alone", () => {
    expect(fitText("Oyo", MAX, BASE, MIN, RATIO)).toEqual({ fontSize: BASE, text: "Oyo" });
  });

  it("shrinks the font for a value that would overflow", () => {
    const fit = fitText("Oluwadamilare Chukwuemeka", MAX, BASE, MIN, RATIO);
    expect(fit.fontSize).toBeLessThan(BASE);
    expect(fit.fontSize).toBeGreaterThanOrEqual(MIN);
    expect(fit.textLength).toBeUndefined();
  });

  it("truncates rather than shrinking past the floor", () => {
    const absurd = "Oluwadamilareoluwa Chukwuemeka-Adeyemi Oluwaseunfunmi Babatunde";
    const fit = fitText(absurd, MAX, BASE, MIN, RATIO);
    expect(fit.fontSize).toBe(MIN);
    expect(fit.text.length).toBeLessThan(absurd.length);
    expect(fit.text.endsWith("\u2026")).toBe(true);
    // textLength is emitted too, but truncation is what actually guarantees fit:
    // the macOS renderer ignores textLength entirely.
    expect(fit.textLength).toBe(MAX);
  });

  it("the RETURNED text fits the budget even if textLength is ignored", () => {
    for (let n = 1; n <= 200; n++) {
      const fit = fitText("W".repeat(n), MAX, BASE, MIN, RATIO);
      expect(fit.text.length * fit.fontSize * RATIO).toBeLessThanOrEqual(MAX + 0.001);
    }
  });

  it("never returns an empty value, however tight the budget", () => {
    const fit = fitText("Oluwadamilare Chukwuemeka Adeyemi", 40, BASE, MIN, RATIO);
    expect(fit.text.length).toBeGreaterThan(0);
  });
});

describe("renderCardSvg overflow handling", () => {
  it("truncates a name no font size could fit", () => {
    const svg = renderCardSvg(
      { ...base, fullName: "Oluwadamilareoluwa Chukwuemeka-Adeyemi Oluwaseunfunmi Babatunde" },
      BLANK,
    );
    expect(svg).toContain('lengthAdjust="spacingAndGlyphs"');
    expect(svg).toContain("\u2026");
  });

  it("shrinks only the offending field, not every row", () => {
    const svg = renderCardSvg({ ...base, fullName: "Oluwadamilare Chukwuemeka Adeyemi" }, BLANK);
    // "Oyo" is short and must keep the full size.
    expect(svg).toMatch(/font-size="62"[^>]*>Oyo</);
    const nameSize = svg.match(/font-size="(\d+)"[^>]*>Oluwadamilare/)?.[1];
    expect(Number(nameSize)).toBeLessThan(62);
  });
});
