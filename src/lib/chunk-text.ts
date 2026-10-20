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

  const cleanText = text.replace(/\s+/g, " ").trim();

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