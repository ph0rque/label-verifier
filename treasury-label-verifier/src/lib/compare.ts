import {
  FieldStatus,
  GovernmentWarningStatus,
  VerificationCheck,
} from "@/types/form";

const ABV_PATTERN = /([0-9]+(?:\.[0-9]+)?)\s*%/;
const NET_CONTENTS_PATTERN = /([0-9]+)\s?(ML|L|FL\.?\s?OZ|OZ)/i;

function withinTolerance(formValue: string, detectedValue: string): boolean {
  const toNumber = (value: string) => parseFloat(value.replace(/%/, ""));
  const formNumber = toNumber(formValue);
  const detectedNumber = toNumber(detectedValue);
  return Math.abs(formNumber - detectedNumber) <= 0.1;
}

export function compareStringField(
  field: "brandName" | "productClassType",
  formValue: string,
  detectedText: string,
): VerificationCheck {
  const detectedValue =
    detectedText && detectedText.toUpperCase().includes(formValue.toUpperCase())
      ? formValue
      : null;

  const status: FieldStatus = detectedValue ? "matched" : "not_found";

  return {
    field,
    status,
    formValue,
    detectedValue,
  };
}

export function compareAlcoholContent(
  formValue: string,
  detectedText: string,
): VerificationCheck {
  const detectedMatch = detectedText.match(ABV_PATTERN);
  const detectedValue = detectedMatch ? `${detectedMatch[1]}%` : null;

  let status: FieldStatus = "not_found";
  if (detectedValue) {
    status = withinTolerance(formValue, detectedValue) ? "matched" : "mismatch";
  }

  return {
    field: "alcoholContent",
    status,
    formValue,
    detectedValue,
  };
}

export function compareNetContents(
  formValue: string,
  detectedText: string,
): VerificationCheck {
  const detectedMatch = detectedText.match(NET_CONTENTS_PATTERN);
  const normalizedFormValue = formValue.toUpperCase().replace(/\./g, "");
  const detectedValue = detectedMatch
    ? `${detectedMatch[1]} ${detectedMatch[2].toUpperCase().replace(/\./g, "")}`.trim()
    : null;

  let status: FieldStatus = "not_found";
  if (detectedValue) {
    status = detectedValue === normalizedFormValue ? "matched" : "mismatch";
  }

  return {
    field: "netContents",
    status,
    formValue,
    detectedValue,
  };
}

export function checkGovernmentWarning(
  detectedText: string,
): VerificationCheck {
  const present = detectedText.toUpperCase().includes("GOVERNMENT WARNING");
  const status: GovernmentWarningStatus = present ? "present" : "missing";
  return {
    field: "governmentWarning",
    status,
    formValue: null,
    detectedValue: present,
  };
}
