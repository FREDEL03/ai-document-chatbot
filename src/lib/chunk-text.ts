export function chunkText(
  text: string,
  chunkSize = 1000,
  overlap = 200
): string[] {
  if (chunkSize <= 0) {
    throw new Error("chunkSize must be greater than zero.");
  }

  if (overlap < 0 || overlap >= chunkSize) {
    throw new Error(
      "overlap must be zero or greater and smaller than chunkSize."
    );
  }

  // Collapse spaces/tabs but keep line breaks, so rows of a table or slide stay on separate lines.
  // (Callers that pass already-flattened text get the same result as before.)
  const cleanText = text.replace(/[^\S\n]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();

  if (!cleanText) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < cleanText.length) {
    const end = Math.min(start + chunkSize, cleanText.length);
    const chunk = cleanText.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end === cleanText.length) {
      break;
    }

    start = end - overlap;
  }

  return chunks;
}