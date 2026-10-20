import fs from "node:fs";
import { PDFParse } from "pdf-parse";

const data = new Uint8Array(fs.readFileSync("./sample.pdf"));
const parser = new PDFParse({ data });

try {
  const result = await parser.getText();

  console.log("===== EXTRACTED PDF TEXT =====");
  console.log(result.text);
} catch (error) {
  console.error("PDF extraction failed:", error);
  process.exitCode = 1;
} finally {
  await parser.destroy();
}