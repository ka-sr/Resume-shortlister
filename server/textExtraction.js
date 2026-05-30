const fs = require("fs/promises");
const path = require("path");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

const printableText = (buffer) =>
  buffer
    .toString("utf8")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function extractTextFromFile(filePath, originalName = "") {
  const ext = path.extname(originalName || filePath).toLowerCase();
  const buffer = await fs.readFile(filePath);

  if (ext === ".pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text || "";
  }

  if (ext === ".docx") {
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value || "";
  }

  if (ext === ".doc") {
    return printableText(buffer);
  }

  if (ext === ".txt") {
    return buffer.toString("utf8");
  }

  throw new Error(`Unsupported file type: ${ext || "unknown"}`);
}

module.exports = { extractTextFromFile };
