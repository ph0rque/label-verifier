# AI-Powered Alcohol Label Verification App

A full-stack TypeScript web application that simulates the TTB (Alcohol and Tobacco Tax and Trade Bureau) label approval process. The app uses OCR (Optical Character Recognition) to extract text from alcohol label images and compares it against submitted form data to identify matches, mismatches, and unreadable fields.

## Features

- **Form-based data collection**: Brand name, product class/type, alcohol content (ABV), net contents
- **Image upload**: JPEG/PNG support with 10MB file size limit and preview
- **AI-powered OCR**: Tesseract.js with image pre-processing (grayscale, normalization, sharpening, upscaling)
- **Intelligent comparison**: Fuzzy matching for brand/class, tolerance-based ABV matching, robust net contents detection, government warning phrase detection
- **Clear results**: Color-coded status badges, detailed field-by-field verification, comprehensive error messages

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Form Handling**: React Hook Form, Zod validation
- **OCR**: Tesseract.js 4.1.1, Sharp (image preprocessing)
- **Testing**: Jest, Testing Library
- **Deployment**: Vercel

## Local Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/ph0rque/treasury.gov.git
cd treasury.gov/treasury-label-verifier

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Environment Variables

No environment variables are required for local development. For production:

- `VERCEL=1` - Auto-detected on Vercel; enables in-process OCR (no child_process)
- `DISABLE_CHILD_OCR=true` - Forces in-process OCR mode if needed
- `NODE_ENV=production` - Disables debug error responses

### Project Structure

```
treasury-label-verifier/
├── src/
│   ├── app/                   # Next.js App Router pages & API routes
│   │   ├── api/verify/        # POST /api/verify endpoint
│   │   ├── page.tsx           # Main form & results page
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── Form.tsx           # Label verification form
│   │   ├── Results.tsx        # Verification results display
│   │   └── LoadingIndicator.tsx
│   ├── lib/                   # Business logic utilities
│   │   ├── ocr.ts             # Tesseract.js OCR extraction
│   │   ├── compare.ts         # Field comparison logic
│   │   └── normalize.ts       # Text normalization
│   ├── types/                 # TypeScript type definitions
│   │   └── form.ts            # Form & verification types
│   └── __tests__/             # Jest unit tests
├── scripts/
│   └── ocr-worker.cjs         # Standalone OCR worker (dev only)
├── test-images/               # Sample test images
│   ├── perfect-match.jpg
│   ├── mismatch.jpg
│   └── blurry.jpg
└── eng.traineddata            # Tesseract English language data
```

## Testing

```bash
# Run all tests with coverage
npm test

# Run specific test file
npm test -- src/__tests__/compare.test.ts

# Run in watch mode
npm test -- --watch
```

### Manual Testing

Use the provided test images in `test-images/`:

1. **perfect-match.jpg**: All fields should match (Old Tom Distillery, Kentucky Straight Bourbon Whiskey, 45%, 750 mL, Government Warning present)
2. **mismatch.jpg**: Should detect mismatches in product class and ABV
3. **blurry.jpg**: Should gracefully handle unreadable fields

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com/new)
3. Set the root directory to `treasury-label-verifier`
4. Deploy

Vercel will automatically:
- Detect the Next.js framework
- Install dependencies
- Build and deploy the app
- Enable in-process OCR mode (no child_process required)

### Build for Production

```bash
npm run build
npm start
```

## Technical Decisions & Assumptions

### OCR Strategy

- **Local development**: Uses a child process worker script (`scripts/ocr-worker.cjs`) to avoid Next.js webpack bundling issues with Tesseract.js worker paths
- **Production (Vercel)**: Falls back to in-process `recognize()` API to avoid child_process restrictions
- **Language data**: Bundled `eng.traineddata` (22MB) for offline OCR; fallback to CDN if missing
- **Pre-processing**: Sharp library upscales to 1200px width, applies grayscale/normalize/sharpen for improved accuracy

### Comparison Logic

- **Brand & Product Class/Type**: Fuzzy token matching with Levenshtein distance (tolerance: 0.66-0.75) to handle OCR typos like "Distilery" vs "Distillery"
- **Alcohol Content (ABV)**:
  - Scans all percentage values and selects the closest to the form value
  - Tolerance: ±0.5%
  - Handles OCR digit confusion (O→0, I/l→1, S→5, B→8)
  - Rejects implausible values (<10% or >80%, or >5% difference from expected)
- **Net Contents**:
  - Scans all quantity+unit patterns and selects the closest
  - Normalizes units (ml/ML, oz/OZ, etc.)
  - Ratio tolerance: 0.8-1.25x
  - Rejects values too far from expected (likely noise)
- **Government Warning**: Fuzzy token proximity detection; allows "GOVERNNENT WARNING" (typo) and separated words within 6 tokens

### Form Validation

- **Client-side**: Zod schema with regex validation for ABV (e.g., `45%`) and net contents (e.g., `750 mL`, `12 fl oz`)
- **Server-side**: Duplicate validation in API route for security; rejects invalid MIME types and oversized files

### Accessibility

- Semantic HTML with ARIA labels
- Keyboard navigation support
- Screen reader announcements for results (`aria-live="polite"`)
- Color contrast ratios meet WCAG AA standards
- Focus indicators with ring-2 ring-blue-400

## Known Limitations

- OCR accuracy depends on image quality; blurry or low-contrast labels may not be fully readable
- Tesseract.js worker initialization can be slow on first load (~1-2s)
- Government warning detection is informational only; does not affect overall pass/fail status
- No persistent storage; each submission is stateless

## License

MIT

## Author

Built as a take-home project for TTB label verification simulation.
