# Product Requirements Document

## 1. Executive Summary
- **Product**: AI-powered alcohol label verification web app assisting Alcohol and Tobacco Tax and Trade Bureau (TTB) reviewers and alcohol producers.
- **Purpose**: Automate comparison between submitted form data and uploaded label imagery using OCR to flag mismatches prior to manual review.
- **MVP Scope**: Single-session workflow covering core label fields mandated by TTB distilled spirits guidance; English-only; hosted on Vercel using a TypeScript stack.
- **Deadline**: Initial MVP due Friday (3 days from kickoff).

## 2. Goals & Non-Goals
- **Goals**
  - Enable users to submit key application fields and a label image in one session.
  - Extract label text via OCR and compare against form inputs with per-field results.
  - Provide accessible, concise decision outputs (match/mismatch/unreadable) with actionable detail.
  - Support rapid deployment and iteration (Vercel, minimal configuration).
- **Non-Goals (MVP)**
  - Multi-language OCR or localization.
  - Advanced fuzzy matching, image region highlighting, or template-based validation.
  - Persisting historical submissions or providing audit dashboards.
  - Full accessibility compliance beyond basic semantic HTML and contrast best practices.

## 3. Target Users & Use Cases
- **TTB Reviewer**
  - Pre-screen submissions to focus manual attention on flagged discrepancies.
  - Confirm compliance of critical label elements quickly.
- **Alcohol Producer**
  - Validate label artwork prior to official submission to avoid rework.

**Primary Use Cases**
1. Reviewer uploads applicant label, confirms all fields match (green path).
2. Reviewer detects mismatched alcohol content and brand name (red path) and shares findings.
3. Producer receives unreadable result due to low-quality image and re-uploads improved version.

## 4. User Experience Overview
- **Entry Point**: Single-page form with fields grouped and descriptive copy referencing TTB requirements.
- **Submission Flow**: User fills inputs, uploads image, submits; UI shows loading state while OCR executes; results render below form with option to revise inputs or upload new image.
- **Feedback Design**
  - Checklist of required fields with status badges (`Matched`, `Mismatch`, `Not Found`).
  - Overall verdict banner (success, issues detected, OCR error).
  - For mismatches, display form value vs detected label snippet.
  - Provide retry guidance for OCR failures (e.g., "Use higher contrast image").
- **Accessibility Baseline**: Semantic HTML, labeled inputs, keyboard-friendly focus order, sufficient color contrast; WAI-ARIA only if needed.

## 5. Functional Requirements

### 5.1 Form Data Capture
- **Required fields** (sourced from distilled spirits spec and assignment brief):
  - `brandName` (text)
  - `productClassType` (text, e.g., "Kentucky Straight Bourbon Whiskey", "Vodka")
  - `alcoholContent` (percentage, e.g., "45%")
  - `netContents` (volume with unit, e.g., "750 mL", "12 fl oz")
- **Optional fields** (bonus features, not required for MVP):
  - `bottlerNameAddress` (text)
  - `governmentWarningAcknowledged` (checkbox confirming expectation)
- **Input validation**: Non-empty text for all required fields; format check for alcohol content (`\d+(\.\d+)?%?`) and net contents (`\d+\s?(mL|L|fl\s?oz|oz)`); enforce client-side and server-side.

### 5.2 Image Upload Handling
- Accept JPEG/PNG up to 10 MB.
- Client: preview thumbnail and allow replacement before submission.
- Server: temporarily store in memory or temp directory for OCR, purge post-processing.

### 5.3 OCR & Data Extraction
- Utilize TypeScript-compatible OCR (e.g., Tesseract.js in serverless function) with English language pack.
- Normalize OCR output: uppercase transformation, collapse whitespace, strip punctuation except `%` and unit tokens.
- Extract candidate values from label text:
  - Brand & class/type: string contains check (case-insensitive).
  - Alcohol content: regex detect `[0-9]+(\.[0-9]+)?%`.
  - Net contents: regex detect `[0-9]+\s?(ML|L|FL\.?\s?OZ|OZ)`.
  - **Government warning phrase**: search for `GOVERNMENT WARNING` in OCR output (MVP baseline feature; flag as informational if missing).

### 5.4 Comparison Logic
- **Comprehensive evaluation**: Comparison logic MUST evaluate ALL required fields and collect ALL discrepancies before returning results; do not short-circuit on first mismatch.
- **Field matching rules**:
  - Brand name & product class/type: case-insensitive substring match with trimmed whitespace.
  - Alcohol content: numeric equality within tolerance of ±0.1% to account for OCR rounding.
  - Net contents: exact match ignoring capitalization and optional punctuation in units.
  - Government warning: boolean presence indicator (included in MVP, reported but does not block overall pass/fail verdict).
- Produce per-field verdict along with detected OCR snippet when available.

### 5.5 Results Reporting
- **Overall verdict** computed as `Match` if all required fields matched; `Mismatch` if any required field mismatched; `Unreadable` if OCR extraction failed entirely.
- **Structured response payload** returned to frontend:
  ```json
  {
    "overallStatus": "match|mismatch|unreadable",
    "checks": [
      { "field": "brandName", "status": "matched|mismatch|not_found", "formValue": "string", "detectedValue": "string|null" },
      { "field": "productClassType", "status": "matched|mismatch|not_found", "formValue": "string", "detectedValue": "string|null" },
      { "field": "alcoholContent", "status": "matched|mismatch|not_found", "formValue": "string", "detectedValue": "string|null" },
      { "field": "netContents", "status": "matched|mismatch|not_found", "formValue": "string", "detectedValue": "string|null" },
      { "field": "governmentWarning", "status": "present|missing", "formValue": null, "detectedValue": "boolean" }
    ],
    "notes": ["string"]
  }
  ```
- **Complete checklist display**: Frontend renders results using accessible list with color-coded badges showing ALL field verdicts regardless of number of mismatches (no partial results).

## 6. Non-Functional Requirements
- **Performance**: End-to-end verification within 5 seconds for typical label images on Vercel; OCR invocation under 3 seconds median.
- **Availability**: Single-region Vercel deployment; acceptable downtime during redeploys.
- **Security & Privacy**
  - HTTPS enforced; no storage of uploaded images beyond session.
  - Reject executable content; validate MIME type and file extension.
  - Sanitize logging to avoid sensitive image data.
- **Logging**: Basic structured logs (submission timestamp, anonymized request ID, field verdict summary, OCR errors). No image content stored.
- **Telemetry**: Track count of successful matches vs mismatches for iteration insights.

## 7. Technical Overview
- **Architecture**: Next.js (App Router) with serverless API route handling multipart submission, invoking OCR worker, returning JSON.
- **OCR Implementation**: Tesseract.js bundled with Next.js serverless function; evaluate lightweight worker thread if needed.
- **State Management**: Client-side React state to manage form inputs and results; no backend persistence.
- **Deployment**: Single Vercel project; environment variables for optional external OCR service keys (placeholder for future).

## 8. Success Metrics
- ≥90% detection accuracy on curated test set of 5-10 sample labels (manual validation).
- Submission-to-result median latency ≤5 seconds.
- Zero critical accessibility blockers (keyboard navigation, screen-reader labels verified).
- Deployment live and accessible by Friday deadline.

## 9. Testing Strategy
- Manual test matrix covering happy path, mismatched values (brand, ABV, net contents), missing warning, unreadable image.
- Include basic automated unit tests for comparison utilities (optional if time permits).
- Smoke test deployment post-launch using same scenarios.

## 10. Risks & Mitigations
- **OCR Accuracy Variance**: Mitigate by recommending high-resolution images, implement normalization and tolerance.
- **Serverless Build Size**: Monitor Tesseract bundle size; use `@tesseract.js/next` or external API fallback if Vercel limits exceeded.
- **Performance on Large Images**: Enforce file size limit and optionally resize image server-side before OCR.
- **Spec Interpretation**: Validate required fields against TTB PDF summary; document assumptions for future refinement.

## 11. Timeline & Milestones
- **Day 0 (Kickoff)**: PRD finalized; environments scaffolded.
- **Day 1**: Form UI + API route skeleton + OCR integration spike.
- **Day 2**: Comparison logic, result UI, error states, deployment pipeline.
- **Day 3 (Friday)**: Testing, polish, documentation, final deploy, README updates.

## 12. Open Questions & Assumptions
- Confirm distilled spirits requirements apply to target use case; adjust field list for other beverages in future iterations.
- Assumed tolerance for alcohol content ±0.1%; validate with stakeholders.
- Government warning treated as informational in MVP; confirm if it should gate overall success in later phases.

## 13. References
- TTB Distilled Spirits Labeling Guidance: https://www.ttb.gov/media/66695/download?inline
- Project assignment brief: `_docs/assignment.md`

