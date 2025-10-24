# System Patterns

## Architectural Overview
- **Next.js App Router** single-page application with server-side API route (`/api/verify`)
- Frontend: React components (Form, Results, LoadingIndicator) with React Hook Form and Zod validation
- Backend: Next.js API route handles multipart form upload, OCR processing, comparison, and structured JSON response
- OCR executes in serverless function with dual-mode support (child process for dev, in-process for Vercel)
- No database or session storage; stateless request/response pattern

## Integration Points
- **Google Cloud Vision API**: Production OCR via ImageAnnotatorClient (text detection)
- **Tesseract.js 4.1.1**: Local development OCR engine via child process worker
- **Sharp**: Image preprocessing (grayscale, normalize, sharpen, upscale to 1200px)
- **Vercel**: Serverless deployment platform with automatic Next.js detection
- OCR worker script: External Node script (`scripts/ocr-worker.cjs`) for local Tesseract.js execution

## Key Patterns
- **Hybrid OCR Strategy**: Google Cloud Vision API when `GOOGLE_CLOUD_VISION_API_KEY` present (production), automatic fallback to local Tesseract.js child process (development)
- **Defensive Comparison Logic**: 
  - Fuzzy token matching for brand/class (Levenshtein distance with 0.66-0.75 tolerance)
  - Contradiction detection for product types (rejects when key words differ, e.g., Beer vs Whiskey)
  - ABV tolerance: ±0.5% with plausibility checks (10-80% range, <5% from expected)
  - Net contents: ratio matching (0.8-1.25x) to handle minor OCR errors
  - Government warning: fuzzy token proximity detection
- **Comprehensive Error Handling**: Returns structured response even for OCR failures, invalid files, or unreadable images
- **Stateless Processing**: Each verification is independent; no persistence between requests
- **Client-side Validation**: Zod schema validates before submission, duplicated server-side for security

