# Host-Aware Tesseract CorePath Fix Plan

1. Inspect `app/src/app/api/verify/route.ts` and `app/src/lib/ocr.ts` to understand current corePath logic.
2. Update API route to read the `Host` header, derive an HTTPS origin, and pass it into OCR helpers.
3. Modify `extractTextFromBuffer` to accept the origin, default to localhost when absent, and build `corePath`/`langPath` based on it.
4. Confirm `public/tesseract` wasm assets are sufficient; adjust comments/docs detailing the flow.
5. Run lint/tests locally and redeploy to Vercel for verification.
