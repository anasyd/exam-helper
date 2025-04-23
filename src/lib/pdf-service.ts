"use client";

import * as pdfjs from 'pdfjs-dist';

// Client-side PDF worker setup
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => item.str || '');
      fullText += textItems.join(' ') + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

// New function to extract text from multiple PDF files
export async function extractTextFromMultiplePDFs(
  files: File[], 
  progressCallback?: (progress: number) => void
): Promise<{ combinedText: string; individualTexts: { name: string, text: string }[] }> {
  try {
    const totalFiles = files.length;
    const individualTexts: { name: string, text: string }[] = [];
    let combinedText = '';
    
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];
      const fileText = await extractTextFromPDF(file);
      
      // Add file header to distinguish content from different files
      const fileHeader = `\n--- FILE: ${file.name} ---\n`;
      
      combinedText += fileHeader + fileText;
      individualTexts.push({ name: file.name, text: fileText });
      
      // Update progress
      if (progressCallback) {
        const progress = Math.round(((fileIndex + 1) / totalFiles) * 100);
        progressCallback(progress);
      }
    }
    
    return { combinedText, individualTexts };
  } catch (error) {
    console.error('Error extracting text from multiple PDFs:', error);
    throw error;
  }
}
