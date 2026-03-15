import * as pdfjs from 'pdfjs-dist';

// Use a locally served worker from the public folder for 100% reliability
const workerSrc = '/pdf.worker.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * Extracts text content from a PDF file.
 * @param {File} file - The PDF file object.
 * @returns {Promise<string>} - The extracted text.
 */
export const extractTextFromPDF = async (file) => {
  let pdf = null;
  try {
    const arrayBuffer = await file.arrayBuffer();
    pdf = await pdfjs.getDocument({ 
      data: arrayBuffer,
      useSystemFonts: true,
      isEvalSupported: false 
    }).promise;
    
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Filter and map items to strings, handling potential non-string items
      const pageText = textContent.items
        .map(item => item.str || '')
        .join(' ');
        
      fullText += `[Page ${i}]\n${pageText}\n\n`;
    }

    const trimmedText = fullText.trim();
    if (!trimmedText && pdf.numPages > 0) {
      throw new Error("This PDF seems to be an image-only scan. I can't read text from it yet.");
    }

    return trimmedText;
  } catch (error) {
    console.error("PDF Extraction Detailed Error:", error);
    if (error.message?.includes("worker")) {
      throw new Error("PDF Worker failed to load. Please check your internet connection.");
    }
    throw new Error(error.message || "Could not read this PDF. It might be protected or corrupted.");
  } finally {
    if (pdf) {
      // Free up memory
      pdf.destroy?.();
    }
  }
};
