# Tech Context

## Languages & Frameworks
- **Next.js 14** with App Router and TypeScript 5.4.5
- **React 18.3.1** for UI components
- **Tailwind CSS 3.4.1** for styling with @tailwindcss/postcss
- **Node.js 18+** runtime requirement

## Core Dependencies
- **OCR & Image Processing**:
  - `tesseract.js` 4.1.1 - OCR engine with English language pack
  - `sharp` 0.33.5 - Image preprocessing and optimization
- **Form Handling & Validation**:
  - `react-hook-form` 7.53.1 - Form state management
  - `zod` 3.23.8 - Schema validation
  - `@hookform/resolvers` 3.9.0 - Zod/React Hook Form integration
- **Testing**:
  - `jest` 29.7.0 with `ts-jest` for TypeScript support
  - `@testing-library/react` and `@testing-library/jest-dom`
  - `jest-environment-jsdom` for component tests

## Project Structure
```
label-verifier/
├── app/                    # Next.js application
│   ├── src/
│   │   ├── app/           # Next.js App Router (pages + API routes)
│   │   ├── components/    # React UI components
│   │   ├── lib/           # Business logic (OCR, comparison, normalization)
│   │   ├── types/         # TypeScript type definitions
│   │   └── __tests__/     # Jest unit tests
│   ├── scripts/           # OCR worker for dev mode
│   ├── public/            # Static assets
│   ├── eng.traineddata    # Tesseract language data (22MB)
│   └── package.json
├── test-images/           # Sample label images
├── memory-bank/           # Project context files
└── _docs/                 # Assignment and PRD materials
```

## Environment & Config
- **Development**: 
  - `npm run dev` starts Next.js dev server on port 3000
  - OCR uses child process worker (`scripts/ocr-worker.cjs`) to avoid webpack issues
- **Production (Vercel)**:
  - `VERCEL=1` auto-detected, enables in-process OCR mode
  - `DISABLE_CHILD_OCR=true` forces in-process mode if needed
  - Root directory set to `app/` in Vercel project settings
- **Testing**: `npm test` runs Jest with coverage reporting
- **Linting**: `npm run lint` runs Next.js ESLint via `.eslintrc.json`

## Key Configuration Files
- `.eslintrc.json` - Next.js ESLint configuration (core-web-vitals)
- `tsconfig.json` - TypeScript compiler options with path aliases (@/)
- `jest.config.js` - Jest configuration with Next.js preset
- `tailwind.config.js` - Tailwind CSS configuration
- `vercel.json` - Vercel deployment settings

