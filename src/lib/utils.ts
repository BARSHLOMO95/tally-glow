import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate separate preview images for each page of a PDF file
 * @param pdfFile - The PDF file to generate previews from
 * @returns An array of Blobs, one for each page
 */
export async function generatePdfPreviews(pdfFile: File): Promise<Blob[]> {
  try {
    // Read the PDF file as ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();

    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    console.log(`📄 PDF has ${numPages} pages - converting each to separate image...`);

    // Set scale for good quality preview (2x for retina displays)
    const scale = 2.0;
    const pageBlobs: Blob[] = [];

    // Render each page separately
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Create canvas for this page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Fill with white background
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Render the page
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error(`Failed to convert page ${pageNum} to blob`));
          }
        }, 'image/png');
      });

      pageBlobs.push(blob);
      console.log(`✅ Rendered page ${pageNum}/${numPages} (${(blob.size / 1024).toFixed(0)}KB)`);
    }

    console.log(`✅ Generated ${numPages} separate images`);
    return pageBlobs;
  } catch (error) {
    console.error('❌ Error generating PDF previews:', error);
    throw error;
  }
}

/**
 * Generate a preview image from ALL pages of a PDF file
 * Combines all pages into a single vertical image (DEPRECATED - use generatePdfPreviews for better quality)
 * @param pdfFile - The PDF file to generate preview from
 * @returns A Blob containing the preview image as PNG
 */
export async function generatePdfPreview(pdfFile: File): Promise<Blob> {
  try {
    // Dynamically import pdfjs-dist only when needed
    const pdfjsLib = await import('pdfjs-dist');
    
    // Configure PDF.js worker - use local worker file
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    // Read the PDF file as ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();

    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    console.log(`📄 PDF has ${numPages} pages - converting all to single image...`);

    // Set scale for good quality preview (2x for retina displays)
    const scale = 2.0;

    // Render all pages and get their dimensions
    const pageCanvases: HTMLCanvasElement[] = [];
    let maxWidth = 0;
    let totalHeight = 0;

    // First pass: render all pages and calculate total dimensions
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Create canvas for this page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render the page
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;

      pageCanvases.push(canvas);
      maxWidth = Math.max(maxWidth, viewport.width);
      totalHeight += viewport.height;

      console.log(`✅ Rendered page ${pageNum}/${numPages}`);
    }

    // Create final combined canvas
    const finalCanvas = document.createElement('canvas');
    const finalContext = finalCanvas.getContext('2d');

    if (!finalContext) {
      throw new Error('Failed to get final canvas context');
    }

    finalCanvas.width = maxWidth;
    finalCanvas.height = totalHeight;

    // Fill with white background
    finalContext.fillStyle = '#FFFFFF';
    finalContext.fillRect(0, 0, maxWidth, totalHeight);

    // Combine all page canvases vertically
    let currentY = 0;
    for (const pageCanvas of pageCanvases) {
      // Center the page horizontally if it's narrower than the max width
      const x = (maxWidth - pageCanvas.width) / 2;
      finalContext.drawImage(pageCanvas, x, currentY);
      currentY += pageCanvas.height;
    }

    console.log(`✅ Combined ${numPages} pages into single image (${maxWidth}x${totalHeight})`);

    // Convert final canvas to blob
    return new Promise<Blob>((resolve, reject) => {
      finalCanvas.toBlob((blob) => {
        if (blob) {
          console.log(`✅ Final blob size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png', 0.95);
    });
  } catch (error) {
    console.error('Error generating PDF preview:', error);
    throw error;
  }
}
