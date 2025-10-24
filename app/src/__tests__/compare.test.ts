/**
 * @jest-environment node
 */
import {
  compareStringField,
  compareAlcoholContent,
  compareNetContents,
  checkGovernmentWarning,
} from "@/lib/compare";

describe("compareStringField", () => {
  it("matches exact substring", () => {
    const result = compareStringField(
      "brandName",
      "Old Tom Distillery",
      "OLD TOM DISTILLERY KENTUCKY STRAIGHT BOURBON WHISKEY"
    );
    expect(result.status).toBe("matched");
    expect(result.detectedValue).toBe("Old Tom Distillery");
  });

  it("matches with fuzzy tokens when OCR introduces typos", () => {
    const result = compareStringField(
      "brandName",
      "Old Tom Distillery",
      "Ola Tom Distilery Kentucky Straight Bourbon"
    );
    expect(result.status).toBe("matched");
  });

  it("returns not_found when text is completely missing", () => {
    const result = compareStringField("brandName", "Old Tom Distillery", "Random Text");
    expect(result.status).toBe("not_found");
  });

  it("returns not_found when key product type words differ (Beer vs Whiskey)", () => {
    const result = compareStringField(
      "productClassType",
      "Kentucky Straight Bourbon Beer",
      "Kentucky Straight Bourbon Whiskey 45% Alc/Vol 750 ML"
    );
    expect(result.status).toBe("not_found");
  });
});

describe("compareAlcoholContent", () => {
  it("matches ABV within tolerance", () => {
    const result = compareAlcoholContent("45%", "OLD TOM DISTILLERY 45% ALC/VOL");
    expect(result.status).toBe("matched");
    expect(result.detectedValue).toBe("45%");
  });

  it("matches with tolerance (45.1% vs 45%)", () => {
    const result = compareAlcoholContent("45%", "45.1% ALC/VOL");
    expect(result.status).toBe("matched");
  });

  it("flags not_found when ABV differs too much (>5%)", () => {
    const result = compareAlcoholContent("45%", "52% ALC/VOL 750ML");
    expect(result.status).toBe("not_found");
    expect(result.detectedValue).toBe("52%");
  });

  it("flags mismatch when ABV differs slightly (within 5%)", () => {
    const result = compareAlcoholContent("45%", "47% ALC/VOL");
    expect(result.status).toBe("mismatch");
    expect(result.detectedValue).toBe("47%");
  });

  it("chooses closest ABV when multiple percentages exist", () => {
    const result = compareAlcoholContent("45%", "4% some text 45% alc/vol 100%");
    expect(result.status).toBe("matched");
    expect(result.detectedValue).toBe("45%");
  });

  it("returns not_found when very implausible ABV detected", () => {
    const result = compareAlcoholContent("45%", "4% ALC/VOL");
    expect(result.status).toBe("not_found");
  });

  it("handles OCR digit confusion (4S% -> 45%)", () => {
    const result = compareAlcoholContent("45%", "4S% ALC/VOL");
    expect(result.status).toBe("matched");
  });
});

describe("compareNetContents", () => {
  it("matches exact net contents", () => {
    const result = compareNetContents("750 mL", "OLD TOM DISTILLERY 750 ML");
    expect(result.status).toBe("matched");
  });

  it("normalizes units (ml vs ML)", () => {
    const result = compareNetContents("750 mL", "750 ml");
    expect(result.status).toBe("matched");
  });

  it("flags mismatch when quantity differs but is plausible", () => {
    const result = compareNetContents("750 mL", "700 ML");
    expect(result.status).toBe("mismatch");
  });

  it("returns not_found when quantity is very implausible", () => {
    const result = compareNetContents("750 mL", "15 ML");
    expect(result.status).toBe("not_found");
  });

  it("chooses closest quantity when multiple candidates exist", () => {
    const result = compareNetContents("750 mL", "50 ML some text 750 mL another 1000 mL");
    expect(result.status).toBe("matched");
  });
});

describe("checkGovernmentWarning", () => {
  it("detects exact phrase", () => {
    const result = checkGovernmentWarning("GOVERNMENT WARNING: according to surgeon general");
    expect(result.status).toBe("present");
  });

  it("detects separated words", () => {
    const result = checkGovernmentWarning("GOVERNMENT text here WARNING");
    expect(result.status).toBe("present");
  });

  it("handles OCR typos (GOVERNNENT)", () => {
    const result = checkGovernmentWarning("GOVERNNENT WARNING ACCORDING TO SURGON GENERAL");
    expect(result.status).toBe("present");
  });

  it("returns missing when not detected", () => {
    const result = checkGovernmentWarning("OLD TOM DISTILLERY BOURBON WHISKEY");
    expect(result.status).toBe("missing");
  });
});

