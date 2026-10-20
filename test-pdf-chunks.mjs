import fs from "node:fs";
import { PDFParse } from "pdf-parse";
import { chunkText } from "./src/lib/chunk-text.ts";

const data = new Uint8Array(fs.readFileSync("./sample.pdf"));
const parser = new PDFParse({ data });

try {
  const result = await parser.getText();
  const chunks = chunkText(result.text, 1000, 200);

  console.log("PDF text extracted successfully.");
  console.log("Total characters:", result.text.length);
  console.log("Total chunks:", chunks.length);

  chunks.forEach((chunk, index) => {
    console.log(`\n--- Chunk ${index + 1} ---`);
    console.log(chunk);
  });
} catch (error) {
  console.error("PDF processing failed:", error);
  process.exitCode = 1;
} finally {
  await parser.destroy();
}