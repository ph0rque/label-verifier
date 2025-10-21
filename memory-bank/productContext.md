# Product Context

## Problem Statement
TTB reviewers must ensure alcohol labels accurately reflect submitted application data, but manual review is time-consuming and error-prone.

## Target Users
- TTB label reviewers seeking faster preliminary verification.
- Alcohol producers preparing submissions who want quick validation feedback.

## Core Experience
1. User enters brand, product type, ABV, and optional net contents via a clean form.
2. User uploads an image of the product label.
3. System extracts label text using OCR, normalizes it, and compares against form inputs.
4. User receives a checklist of matching/mismatching fields with guidance on errors or unreadable inputs.

## Success Metrics
- Accurate detection of key label information (brand, class/type, ABV, net contents, warning text if implemented).
- Clear mismatch explanations enabling corrective action.
- Smooth single-session workflow without requiring logins or persistent storage.

