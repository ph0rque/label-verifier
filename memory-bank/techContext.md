# Tech Context

## Languages & Frameworks
- Preference for TypeScript-driven full-stack solution (e.g., Next.js API routes or Remix).
- OCR tooling: Tesseract.js or other Node-compatible libraries/services with free tiers.

## Dependencies & Tooling
- Image handling within TypeScript stack (e.g., Next.js `formidable`, `sharp` if needed).
- Text normalization/comparison utilities (string similarity, regex extraction for percentages/units).
- Deployment target preference: Vercel for combined frontend/backend hosting.

## Environment & Config
- Manage OCR provider credentials via environment variables if using external APIs with free tiers.
- Ensure deployment accommodates OCR binary requirements (e.g., Vercel-compatible builds or serverless bundling).

