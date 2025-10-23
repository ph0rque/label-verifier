# PRD Implementation Tasks

## Phase 1: Project Scaffolding & Setup

1. [x] Initialize Next.js project with TypeScript and App Router
2. [x] Install core dependencies: tesseract.js, sharp (image optimization), zod (validation), react-hook-form
3. [x] Create project structure: app/, lib/, components/, types/, public/

## Phase 2: Form UI & Image Upload

4. [x] Define TypeScript types for form submission (brandName, productClassType, alcoholContent, netContents)
5. [x] Implement client-side validation using Zod for required fields and format checks (ABV regex, net contents regex)
6. [x] Build React form component with semantic HTML, labeled inputs, keyboard accessibility
7. [x] Implement image upload handler with JPEG/PNG support, 10MB limit, file validation, preview thumbnail
8. [x] Style form with clean, accessible design (sufficient color contrast, semantic structure)

## Phase 3: Backend OCR & Comparison Logic

9. [x] Create Next.js API route POST /api/verify to handle multipart form submission with file upload
10. [x] Integrate Tesseract.js into API route to extract text from label image
11. [x] Implement text normalization utilities: uppercase, collapse whitespace, strip punctuation (except % and units)
12. [x] Implement extraction logic for brand, class/type, ABV (regex [0-9]+(\.[0-9]+)?%), net contents (regex [0-9]+\s?(ML|L|FL\.?\s?OZ|OZ)), government warning phrase
13. [x] Implement comprehensive comparison logic: case-insensitive substring match for brand/class, ±0.1% tolerance for ABV, exact match for net contents, government warning detection
14. [x] Structure and return JSON payload with overallStatus (match|mismatch|unreadable), per-field checks array, notes array
15. [x] Implement error handling for OCR failures, invalid files, missing fields, and edge cases

## Phase 4: Results Display & UX

16. [x] Build React results component displaying overall verdict banner and per-field checklist
17. [x] Implement color-coded status badges (Matched=green, Mismatch=red, Not Found=gray, Missing=yellow) with semantic HTML
18. [x] Display form value vs detected label snippet for each mismatch with clear explanations
19. [x] Create user-friendly error messages for OCR failures with retry guidance (e.g., higher contrast image)
20. [x] Implement loading indicator UI while OCR is processing
21. [x] Add ability to revise form inputs or replace image without refilling entire form

## Phase 5: Testing & Validation

22. [x] Manual test: perfect-match.jpg with matching form data (Old Tom Distillery, 45%, 750mL, etc.) - verify all fields pass
23. [x] Manual test: mismatch.jpg with form data showing different ABV and class/type - verify mismatches are detected and reported
24. [x] Manual test: blurry.jpg - verify graceful error handling and helpful error message
25. [x] Test edge cases: missing fields, invalid file types, oversized files, OCR extraction failures
26. [x] Optional: Add unit tests for comparison utilities (string matching, ABV tolerance, regex extraction)
27. [x] Verify keyboard navigation, screen reader labels, color contrast ratios meet baseline standards

## Phase 6: Deployment & Documentation

28. [x] Configure Vercel deployment with environment variables and build settings
29. [x] Write README with local development setup: npm install, npm run dev, .env.local instructions
30. [x] Document deployment process and deployed app URL in README
31. [x] Document technical decisions and assumptions (e.g., OCR tolerance, matching logic, Tesseract.js choice)
32. [ ] Final smoke test on deployed Vercel instance: submit form, verify OCR, check results
33. [ ] Code cleanup, console error checks, performance optimization, final visual pass
