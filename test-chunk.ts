import { chunkText } from "./src/lib/chunk-text";

const sampleText = "This is a sample document. ".repeat(100);

const chunks = chunkText(sampleText, 1000, 200);

console.log("Number of chunks:", chunks.length);

chunks.forEach((chunk, index) => {
  console.log(`Chunk ${index + 1} length:`, chunk.length);
  console.log(chunk.slice(0, 80) + "...");
});