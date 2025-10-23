import type { VerificationResponse } from "@/types/form";

const STATUS_LABELS: Record<string, string> = {
  match: "All fields matched",
  mismatch: "Mismatches detected",
  unreadable: "Missing or unreadable fields",
};

const STATUS_CLASSES: Record<string, string> = {
  match: "bg-green-100 text-green-800 border-green-200",
  mismatch: "bg-red-100 text-red-800 border-red-200",
  unreadable: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const FIELD_LABELS: Record<string, string> = {
  brandName: "Brand name",
  productClassType: "Product class/type",
  alcoholContent: "Alcohol content",
  netContents: "Net contents",
  governmentWarning: "Government warning",
};

const CHECK_STATUS_CLASSES: Record<string, string> = {
  matched: "bg-green-100 text-green-800",
  mismatch: "bg-red-100 text-red-800",
  not_found: "bg-yellow-100 text-yellow-800",
  present: "bg-green-100 text-green-800",
  missing: "bg-yellow-100 text-yellow-800",
};

type ResultsProps = {
  result: VerificationResponse | null;
  error: string | null;
};

export function VerificationResults({ result, error }: ResultsProps) {
  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
        {error}
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div
        className={`rounded-md border px-4 py-3 text-sm font-medium ${STATUS_CLASSES[result.overallStatus]}`.trim()}
        role="status"
        aria-live="polite"
      >
        {STATUS_LABELS[result.overallStatus]}
      </div>

      {result.checks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-800">Field checks</h3>
          <ul className="space-y-2">
            {result.checks.map((check) => (
              <li key={check.field} className="rounded-md border border-zinc-200 bg-white p-3 text-sm shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-900">
                    {FIELD_LABELS[check.field] ?? check.field}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${CHECK_STATUS_CLASSES[check.status]}`.trim()}
                  >
                    {check.status.replace("_", " ")}
                  </span>
                </div>

                {check.formValue && (
                  <p className="mt-2 text-xs text-zinc-600">
                    Form value: <span className="font-medium text-zinc-800">{check.formValue}</span>
                  </p>
                )}

                {check.detectedValue !== null && (
                  <p className="text-xs text-zinc-600">
                    Detected: {String(check.detectedValue)}
                  </p>
                )}

                {check.notes && check.notes.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-zinc-600">
                    {check.notes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.notes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-800">Summary</h3>
          <ul className="list-disc space-y-1 pl-4 text-sm text-zinc-600">
            {result.notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
