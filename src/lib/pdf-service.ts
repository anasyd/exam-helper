"use client";

import * as pdfjs from 'pdfjs-dist';

// Set the worker source path directly
if (typeof window !== 'undefined') {
  // Import the worker source directly 
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document using pdfjs
    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const textItems = textContent.items.map((item: any) => {
        if ('str' in item) {
          return item.str;
        }
        return '';
      });
      
      fullText += textItems.join(' ') + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}