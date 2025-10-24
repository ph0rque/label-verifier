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
- **OCR**: Google Cloud Vision API (production), Tesseract.js 4.1.1 (local dev), Sharp (image preprocessing)
- **Testing**: Jest, Testing Library (27 tests passing)
- **Deployment**: Vercel

## Local Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/ph0rque/label-verifier.git
cd label-verifier/app

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Environment Variables

**For local development with Google Cloud Vision** (optional):

Create `app/.env` file:
```bash
GOOGLE_CLOUD_VISION_API_KEY=your_api_key_here
```

If this variable is not set, the app automatically falls back to local Tesseract.js OCR (no API costs).

**For production (Vercel)**:
- `GOOGLE_CLOUD_VISION_API_KEY` - **Required** for production OCR (see Deployment section below)
- `VERCEL=1` - Auto-detected; used for runtime environment detection
- `NODE_ENV=production` - Disables debug error responses

### Project Structure

```
label-verifier/
├── app/
│   ├── src/
│   │   ├── app/                   # Next.js App Router pages & API routes
│   │   ├── components/            # React components
│   │   ├── lib/                   # Business logic utilities
│   │   ├── types/                 # TypeScript type definitions
│   │   └── __tests__/             # Jest unit tests
│   ├── scripts/
│   │   └── ocr-worker.cjs         # Standalone OCR worker (dev only)
│   ├── public/                    # Static assets
│   ├── eng.traineddata            # Tesseract English language data
│   └── package.json               # Next.js project manifest
├── _docs/                         # Assignment and PRD materials
├── memory-bank/                   # Project memory context files
└── test-images/                   # Sample label images used in tests
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

### Live Demo

🔗 **[View Deployed App on Vercel](https://label-verifier.vercel.app)** *(Update this URL after deployment)*

### Deploy Your Own Instance

**Prerequisites**: Google Cloud Vision API key (required for production OCR)

1. **Get Google Cloud Vision API Key**:
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable "Cloud Vision API" from the API Library
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated key
   - (Recommended) Restrict the key to "Cloud Vision API" only

2. **Deploy to Vercel**:
   - Push your code to GitHub
   - Import the project in [Vercel](https://vercel.com/new)
   - Set the **root directory** to `app`
   - Add environment variable:
     - Key: `GOOGLE_CLOUD_VISION_API_KEY`
     - Value: Your API key from step 1
     - Environments: Production, Preview, Development
   - Deploy

Vercel will automatically detect Next.js, install dependencies, and build the app.

**Why Google Cloud Vision?** After extensive testing (20+ attempts documented in `memory-bank/progress.md`), Tesseract.js proved incompatible with Vercel's serverless environment due to WebAssembly worker bundling issues. Google Cloud Vision provides reliable, serverless-optimized OCR while keeping local development free via Tesseract.js fallback.

### Build for Production Locally

```bash
npm run build
npm start
```

## Technical Decisions & Assumptions

### OCR Strategy

- **Production (Vercel)**: Google Cloud Vision API for reliable, serverless-compatible text detection
- **Local development**: Tesseract.js via child process worker (`scripts/ocr-worker.cjs`) - free, no API costs
- **Automatic fallback**: If `GOOGLE_CLOUD_VISION_API_KEY` is not set, uses local Tesseract.js
- **Pre-processing**: Sharp library upscales to 1200px width, applies grayscale/normalize/sharpen for improved accuracy
- **Language support**: English only via Google Cloud Vision or Tesseract English training data

### Comparison Logic

- **Brand & Product Class/Type**: 
  - Fuzzy token matching with Levenshtein distance (tolerance: 0.66-0.75) to handle OCR typos like "Distilery" vs "Distillery"
  - Contradiction detection: rejects matches when key product type words differ (e.g., "Beer" vs "Whiskey")
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
- Google Cloud Vision API has usage limits: 1,000 requests/month free tier, then pay-per-use
- Local Tesseract.js (dev fallback) can be slower (~1-2s initialization) than Cloud Vision
- Government warning detection is informational only; does not affect overall pass/fail status
- No persistent storage; each submission is stateless

## License

MIT

## Author

Built as a take-home project for TTB label verification simulation.
