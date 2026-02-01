import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a preview image from the first page of a PDF file
 * @param pdfFile - The PDF file to generate preview from
 * @returns A Blob containing the preview image as PNG
 */
export async function generatePdfPreview(pdfFile: File): Promise<Blob> {
  try {
    // Read the PDF file as ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();

    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // Get the first page
    const page = await pdf.getPage(1);

    // Set scale for good quality preview (2x for retina displays)
    const scale = 2.0;
    const viewport = page.getViewport({ scale });

    // Create a canvas element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    // Set canvas dimensions
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render the page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Convert canvas to blob
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
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
