/**
 * @jest-environment node
 */

import { POST } from "@/app/api/verify/route";
import { extractTextFromImage } from "@/lib/ocr";

jest.mock("@/lib/ocr", () => ({
  extractTextFromImage: jest.fn(),
}));

const BRAND = "Old Tom Distillery";
const CLASS_TYPE = "Kentucky Straight Bourbon Whiskey";
const ABV = "45%";
const NET = "750 mL";

function buildFormData(overrides: Partial<Record<string, string>> = {}) {
  const form = new FormData();
  form.append("brandName", overrides.brandName ?? BRAND);
  form.append("productClassType", overrides.productClassType ?? CLASS_TYPE);
  form.append("alcoholContent", overrides.alcoholContent ?? ABV);
  form.append("netContents", overrides.netContents ?? NET);
  form.append(
    "labelImage",
    new File([new Uint8Array([1, 2, 3])], "label.png", { type: "image/png" }),
  );
  return form;
}

async function invokeVerify(formData: FormData) {
  const request = {
    formData: async () => formData,
  } as unknown as Request;

  const response = await POST(request);
  const json = await response.json();
  return { status: response.status, json };
}

describe("POST /api/verify", () => {
  const mockExtract = extractTextFromImage as jest.MockedFunction<
    typeof extractTextFromImage
  >;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns match when all values align", async () => {
    mockExtract.mockResolvedValue(
      `OLD TOM DISTILLERY\nKENTUCKY STRAIGHT BOURBON WHISKEY\n45% ALC./VOL.\n750 ML\nGOVERNMENT WARNING: ...`
    );

    const { status, json } = await invokeVerify(buildFormData());

    expect(status).toBe(200);
    expect(json.overallStatus).toBe("match");
    expect(json.checks).toHaveLength(5);
    expect(json.notes).toContain("All required fields matched the form input.");
  });

  it("flags mismatched alcohol content", async () => {
    mockExtract.mockResolvedValue(
      `OLD TOM DISTILLERY\nKENTUCKY STRAIGHT BOURBON WHISKEY\n47% ALC./VOL.\n750 ML\nGOVERNMENT WARNING`
    );

    const { status, json } = await invokeVerify(buildFormData());

    expect(status).toBe(200);
    expect(json.overallStatus).toBe("mismatch");
    const abvCheck = json.checks.find(
      (check: any) => check.field === "alcoholContent"
    );
    expect(abvCheck?.status).toBe("mismatch");
    expect(json.notes.some((note: string) => note.includes("Alcohol content"))).toBe(
      true,
    );
  });

  it("returns unreadable when OCR output is empty", async () => {
    mockExtract.mockResolvedValue("");

    const { status, json } = await invokeVerify(buildFormData());

    expect(status).toBe(200);
    expect(json.overallStatus).toBe("unreadable");
    expect(json.notes[0]).toMatch(/No legible text/i);
  });

  it("returns 400 for invalid file type", async () => {
    mockExtract.mockResolvedValue("SHOULD NOT BE CALLED");

    const form = buildFormData();
    form.set(
      "labelImage",
      new File([new Uint8Array([1])], "label.gif", { type: "image/gif" }),
    );

    const { status, json } = await invokeVerify(form);

    expect(status).toBe(400);
    expect(json.error).toMatch(/Unsupported file type/);
    expect(mockExtract).not.toHaveBeenCalled();
  });
});
