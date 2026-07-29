import { describe, it, expect } from "vitest";
import { renderCardSvg, cardFileName, CARD_WIDTH, CARD_HEIGHT } from "./membership-card";

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
