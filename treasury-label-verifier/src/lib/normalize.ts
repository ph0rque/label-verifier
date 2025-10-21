const UNIT_REGEX = /(ML|L|FL\.?\s?OZ|OZ)/gi;

export function normalizeText(text: string): string {
  return text
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .toUpperCase()
    .trim();
}

export function stripPunctuationExceptPercentAndUnits(text: string): string {
  return text.replace(/[^A-Z0-9% \./]/g, "");
}

export function extractUnitTokens(text: string): string {
  return normalizeText(text).replace(UNIT_REGEX, (match) => match.toUpperCase());
}
