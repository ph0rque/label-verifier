import {
  FieldStatus,
  GovernmentWarningStatus,
  VerificationCheck,
} from "@/types/form";

const ABV_PATTERN_GLOBAL = /([0-9OIlS]{1,3}(?:\.[0-9OIlS]+)?)\s*%/gi;
const NET_CONTENTS_PATTERN_GLOBAL = /([0-9OIlS]{2,4})\s?(ML|L|FL\.?\s?OZ|OZ)/gi;

function withinTolerance(formValue: string, detectedValue: string, tolerance = 0.5): boolean {
  const toNumber = (value: string) => parseFloat(value.replace(/%/, ""));
  const formNumber = toNumber(formValue);
  const detectedNumber = toNumber(detectedValue);
  return isFinite(formNumber) && isFinite(detectedNumber) && Math.abs(formNumber - detectedNumber) <= tolerance;
}

function tokenize(text: string): string[] {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function similarityRatio(a: string, b: string): number {
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

function fuzzyMatchByTokens(formValue: string, detectedText: string): string | null {
  const formTokens = tokenize(formValue);
  const detectedTokens = tokenize(detectedText);
  if (formTokens.length === 0 || detectedTokens.length === 0) return null;

  let matched = 0;
  for (const t of formTokens) {
    let best = 0;
    for (const dt of detectedTokens) {
      const score = similarityRatio(t, dt);
      if (score > best) best = score;
      if (best >= 0.9) break; // early stop on strong match
    }
    const shortToken = t.length <= 3;
    const threshold = shortToken ? 0.66 : 0.75;
    if (best >= threshold) matched++;
  }

  const coverage = matched / formTokens.length;
  return coverage >= 0.66 ? formValue : null;
}

function mapOcrDigits(s: string): string {
  return s
    .replace(/[O]/gi, "0")
    .replace(/[I|l]/g, "1")
    .replace(/[S]/gi, "5")
    .replace(/[B]/gi, "8");
}

function parseFloatSafeFromOcr(s: string): number {
  const fixed = mapOcrDigits(s);
  const num = parseFloat(fixed);
  return isFinite(num) ? num : NaN;
}

export function compareStringField(
  field: "brandName" | "productClassType",
  formValue: string,
  detectedText: string,
): VerificationCheck {
  let detectedValue: string | null = null;
  if (detectedText) {
    const normalizedForm = formValue.toUpperCase();
    if (detectedText.toUpperCase().includes(normalizedForm)) {
      detectedValue = formValue;
    } else {
      detectedValue = fuzzyMatchByTokens(formValue, detectedText);
    }
  }

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
  const matches = Array.from(detectedText.matchAll(ABV_PATTERN_GLOBAL));
  let detectedValue: string | null = null;
  if (matches.length > 0) {
    // Choose the percentage closest to the form value
    const formNum = parseFloat(formValue.replace(/%/, ""));
    let bestDiff = Number.POSITIVE_INFINITY;
    for (const m of matches) {
      const num = parseFloatSafeFromOcr(m[1]);
      if (!isFinite(num)) continue;
      const diff = Math.abs(formNum - num);
      if (diff < bestDiff) {
        bestDiff = diff;
        detectedValue = `${Math.round(num * 100) / 100}%`;
      }
    }
  }
  // Fallback: scan any 1-3 digit numbers in reasonable ABV range if no % found
  if (!detectedValue) {
    const anyNums = Array.from(detectedText.matchAll(/[0-9OIlS]{1,3}(?:\.[0-9OIlS]+)?/g));
    const formNum = parseFloat(formValue.replace(/%/, ""));
    let bestDiff = Number.POSITIVE_INFINITY;
    for (const m of anyNums) {
      const n = parseFloatSafeFromOcr(m[0]);
      if (!isFinite(n) || n < 1 || n > 80) continue;
      const diff = Math.abs(formNum - n);
      if (diff < bestDiff) {
        bestDiff = diff;
        detectedValue = `${Math.round(n * 100) / 100}%`;
      }
    }
  }
  let status: FieldStatus = "not_found";
  if (detectedValue) {
    status = withinTolerance(formValue, detectedValue) ? "matched" : "mismatch";
    // If very implausible reading relative to expected, treat as not_found (likely OCR noise)
    const formNum = parseFloat(formValue.replace(/%/, ""));
    const detNum = parseFloat(detectedValue.replace(/%/, ""));
    if (isFinite(formNum) && isFinite(detNum)) {
      const diff = Math.abs(formNum - detNum);
      if (diff > 5 || detNum < 10 || detNum > 80) {
        status = "not_found";
      }
    }
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
  const normalizedFormValue = formValue.toUpperCase().replace(/\./g, "");
  const formNumMatch = normalizedFormValue.match(/([0-9]{2,4})/);
  const formNum = formNumMatch ? parseInt(formNumMatch[1], 10) : NaN;

  const matches = Array.from(detectedText.matchAll(NET_CONTENTS_PATTERN_GLOBAL));
  let detectedValue: string | null = null;
  if (matches.length > 0) {
    let bestDiff = Number.POSITIVE_INFINITY;
    for (const m of matches) {
      const num = parseInt(mapOcrDigits(m[1]), 10);
      let unit = (m[2] || "").toUpperCase().replace(/\./g, "");
      unit = unit.replace(/M1|MI/g, "ML").replace(/0Z|O2|Z2/g, "OZ").replace(/^1$/, "L");
      const candidate = `${num} ${unit}`.trim();
      const diff = isFinite(formNum) ? Math.abs(formNum - num) : Number.POSITIVE_INFINITY;
      if (diff < bestDiff) {
        bestDiff = diff;
        detectedValue = candidate;
      }
    }
  }
  // Fallback: if still nothing, pick nearest 2-4 digit number as mL
  if (!detectedValue) {
    const nums = Array.from(detectedText.matchAll(/[0-9OIlS]{2,4}/g));
    if (nums.length > 0 && isFinite(formNum)) {
      let bestDiff = Number.POSITIVE_INFINITY;
      let bestNum: number | null = null;
      for (const m of nums) {
        const n = parseInt(mapOcrDigits(m[0]), 10);
        if (!isFinite(n)) continue;
        const diff = Math.abs(formNum - n);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestNum = n;
        }
      }
      if (bestNum !== null) detectedValue = `${bestNum} ML`;
    }
  }

  let status: FieldStatus = "not_found";
  if (detectedValue) {
    const detNumMatch = detectedValue.match(/([0-9]{2,4})/);
    const detNum = detNumMatch ? parseInt(detNumMatch[1], 10) : NaN;
    if (isFinite(formNum) && isFinite(detNum)) {
      const ratio = detNum / formNum;
      if (ratio > 0.8 && ratio < 1.25) {
        status = detNum === formNum ? "matched" : "mismatch";
      } else {
        status = "not_found";
      }
    } else {
      status = "not_found";
    }
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
  const upper = detectedText.toUpperCase();
  let present = upper.includes("GOVERNMENT WARNING") || (upper.includes("GOVERNMENT") && upper.includes("WARNING"));

  if (!present) {
    // Fuzzy token-based detection to tolerate OCR errors like "GOVERNNENT"
    const tokens = tokenize(upper);
    const govIdx: number[] = [];
    const warnIdx: number[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (similarityRatio(t, "GOVERNMENT") >= 0.75 || t.startsWith("GOVERN")) govIdx.push(i);
      if (similarityRatio(t, "WARNING") >= 0.8 || t.startsWith("WARN")) warnIdx.push(i);
    }
    outer: for (const i of govIdx) {
      for (const j of warnIdx) {
        if (Math.abs(i - j) <= 6) {
          present = true;
          break outer;
        }
      }
    }
  }
  const status: GovernmentWarningStatus = present ? "present" : "missing";
  return {
    field: "governmentWarning",
    status,
    formValue: null,
    detectedValue: present,
  };
}
