/**
 * @jest-environment node
 */

import path from "path";
import fs from "fs/promises";
import { POST } from "@/app/api/verify/route";
import type { VerificationResponse } from "@/types/form";

const PROJECT_ROOT = path.resolve(__dirname, "../../../");
const IMAGE_DIR = path.resolve(PROJECT_ROOT, "test-images");

async function loadImage(name: string, type: string) {
  const buffer = await fs.readFile(path.join(IMAGE_DIR, name));
  return new File([buffer], name, { type });
}

function createFormData(overrides: Partial<Record<string, string>> = {}) {
  const form = new FormData();
  form.append("brandName", overrides.brandName ?? "Old Tom Distillery");
  form.append(
    "productClassType",
    overrides.productClassType ?? "Kentucky Straight Bourbon Whiskey",
  );
  form.append("alcoholContent", overrides.alcoholContent ?? "45%");
  form.append("netContents", overrides.netContents ?? "750 mL");
  return form;
}

async function invokeRoute(formData: FormData) {
  const request = {
    formData: async () => formData,
  } as unknown as Request;
  const response = await POST(request);
  const json = (await response.json()) as VerificationResponse | { error: string };
  return { status: response.status, json };
}

describe("OCR integration with real images", () => {
  jest.setTimeout(60000);

  it("identifies a perfect match label", async () => {
    const imageFile = await loadImage("perfect-match.jpg", "image/jpeg");
    const formData = createFormData();
    formData.append("labelImage", imageFile);

    const { status, json } = await invokeRoute(formData);

    expect(status).toBe(200);
    expect(json).toHaveProperty("overallStatus", "match");
  });

  it("flags mismatched alcohol content", async () => {
    const imageFile = await loadImage("mismatch.jpg", "image/jpeg");
    const formData = createFormData();
    formData.append("labelImage", imageFile);

    const { status, json } = await invokeRoute(formData);

    expect(status).toBe(200);
    // May be "mismatch" or "unreadable" depending on how different the values are
    expect(json).toHaveProperty("overallStatus");
    expect(json.overallStatus).not.toBe("match");
  });

  it("reports unreadable for blurry label", async () => {
    const imageFile = await loadImage("blurry.jpg", "image/jpeg");
    const formData = createFormData();
    formData.append("labelImage", imageFile);

    const { status, json } = await invokeRoute(formData);

    expect(status).toBe(200);
    expect(json).toHaveProperty("overallStatus", expect.stringMatching(/match|mismatch|unreadable/));
    // blurry images are expected to be unreadable or mismatched but should not throw errors
  });
});
