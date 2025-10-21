import { NextRequest, NextResponse } from "next/server";
import { extractTextFromImage } from "@/lib/ocr";
import { normalizeText } from "@/lib/normalize";
import {
  compareStringField,
  compareAlcoholContent,
  compareNetContents,
  checkGovernmentWarning,
} from "@/lib/compare";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const requiredFields = [
      "brandName",
      "productClassType",
      "alcoholContent",
      "netContents",
    ];

    for (const field of requiredFields) {
      if (!formData.get(field)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 },
        );
      }
    }

    const labelFile = formData.get("labelImage");
    if (!labelFile || !(labelFile instanceof File)) {
      return NextResponse.json(
        { error: "Label image file is required" },
        { status: 400 },
      );
    }

    const rawText = await extractTextFromImage(labelFile);
    const normalizedText = normalizeText(rawText);

    const checks = [
      compareStringField(
        "brandName",
        formData.get("brandName") as string,
        normalizedText,
      ),
      compareStringField(
        "productClassType",
        formData.get("productClassType") as string,
        normalizedText,
      ),
      compareAlcoholContent(
        formData.get("alcoholContent") as string,
        normalizedText,
      ),
      compareNetContents(
        formData.get("netContents") as string,
        normalizedText,
      ),
      checkGovernmentWarning(normalizedText),
    ];

    const hasMismatch = checks.some(
      (check) => check.field !== "governmentWarning" && check.status === "mismatch",
    );
    const missingRequired = checks.some(
      (check) =>
        check.field !== "governmentWarning" && check.status === "not_found",
    );

    const overallStatus = hasMismatch
      ? "mismatch"
      : missingRequired
        ? "unreadable"
        : "match";

    return NextResponse.json({
      overallStatus,
      checks,
      notes: [],
    });
  } catch (error) {
    console.error("Verification API error", error);
    return NextResponse.json(
      { error: "Unexpected error during verification" },
      { status: 500 },
    );
  }
}
