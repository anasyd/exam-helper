"use client";

import * as pdfjs from "pdfjs-dist";
import mammoth from "mammoth";

// Client-side PDF worker setup
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => item.str || "");
      fullText += textItems.join(" ") + "\n";
    }
    return fullText.trim();
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw error;
  }
}

// Function to extract text from a single DOCX
async function extractTextFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

// Function to extract text from a single TXT
async function extractTextFromTXT(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === "string") {
        resolve(event.target.result.trim());
      } else {
        reject(new Error("Failed to read TXT file."));
      }
    };
    reader.onerror = () => {
      reject(new Error("Error reading TXT file."));
    };
    reader.readAsText(file);
  });
}

// Function to extract text from multiple documents and provide progress updates
export async function extractTextFromMultipleDocuments(
  files: File[],
  onProgress: (progress: number) => void
): Promise<{ combinedText: string; individualTexts?: { name: string, text: string }[] }> {
  let combinedText = "";
  const individualTexts: { name: string, text: string }[] = [];
  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    let text = "";
    const fileHeader = `\n--- FILE: ${file.name} ---\n`;
    try {
      if (file.type === "application/pdf") {
        text = await extractTextFromPDF(file);
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        text = await extractTextFromDOCX(file);
      } else if (file.type === "text/plain") {
        text = await extractTextFromTXT(file);
      } else {
        console.warn(`Unsupported file type: ${file.name} (${file.type})`);
        // Optionally skip or throw error for unsupported types
        continue;
      }

      combinedText += fileHeader + text + "\n\n"; // Add extra newline between documents
      individualTexts.push({ name: file.name, text });

      // Update progress
      const progress = Math.round(((i + 1) / totalFiles) * 90) + 10; // Start from 10% up to 100%
      onProgress(progress);
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      throw new Error(
        `Failed to process ${file.name}. Ensure the file is not corrupted and is a supported type (PDF, DOCX, TXT).`
      );
    }
  }

  return { combinedText: combinedText.trim(), individualTexts };
}
