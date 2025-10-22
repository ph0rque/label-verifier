import { NextRequest, NextResponse } from "next/server";
import { extractTextFromImage } from "@/lib/ocr";
import { normalizeText } from "@/lib/normalize";
import {
  compareStringField,
  compareAlcoholContent,
  compareNetContents,
  checkGovernmentWarning,
} from "@/lib/compare";
import type { VerificationCheck, VerificationResponse } from "@/types/form";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

const FIELD_LABELS: Record<string, string> = {
  brandName: "Brand name",
  productClassType: "Product class/type",
  alcoholContent: "Alcohol content",
  netContents: "Net contents",
};

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
          { error: `Missing required field: ${FIELD_LABELS[field] ?? field}` },
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

    if (!ALLOWED_MIME_TYPES.has(labelFile.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a JPEG or PNG image." },
        { status: 400 },
      );
    }

    if (labelFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 10 MB." },
        { status: 400 },
      );
    }

    let rawText = "";
    try {
      rawText = await extractTextFromImage(labelFile);
    } catch (error) {
      console.error("OCR error during extractTextFromImage:", error);
      const message =
        error instanceof Error && error.name === "OCR_EXTRACT_FAILED"
          ? "OCR processing failed. Ensure the label image is clear and try again."
          : "Unexpected OCR error occurred. Please retry.";

      const debug =
        process.env.NODE_ENV !== "production" && error instanceof Error
          ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
          : undefined;

      return NextResponse.json({ error: message, debug }, { status: 502 });
    }

    const normalizedText = normalizeText(rawText);

    if (!normalizedText) {
      const response: VerificationResponse = {
        overallStatus: "unreadable",
        checks: [],
        notes: [
          "No legible text detected in the uploaded label. Try a higher-resolution image with more contrast.",
        ],
      };
      return NextResponse.json(response);
    }

    const checks: VerificationCheck[] = [
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

    const notes: string[] = [];
    const hasMismatch = checks.some(
      (check) => check.field !== "governmentWarning" && check.status === "mismatch",
    );
    const missingRequired = checks.some(
      (check) =>
        check.field !== "governmentWarning" && check.status === "not_found",
    );

    checks.forEach((check) => {
      if (check.field === "governmentWarning") {
        if (check.status === "missing") {
          notes.push("Government warning text not detected in OCR output.");
        }
        return;
      }

      const label = FIELD_LABELS[check.field] ?? check.field;
      if (check.status === "mismatch") {
        notes.push(
          `${label} mismatch: expected "${check.formValue}" but detected "${check.detectedValue ?? ""}"`,
        );
      } else if (check.status === "not_found") {
        notes.push(`Could not locate ${label.toLowerCase()} in the label text.`);
      }
    });

    if (!hasMismatch && !missingRequired) {
      notes.push("All required fields matched the form input.");
    }

    const overallStatus = hasMismatch
      ? "mismatch"
      : missingRequired
        ? "unreadable"
        : "match";

    const response: VerificationResponse = {
      overallStatus,
      checks,
      notes,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Verification API error", error);
    return NextResponse.json(
      { error: "Unexpected error during verification" },
      { status: 500 },
    );
  }
}
