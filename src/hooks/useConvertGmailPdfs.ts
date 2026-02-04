import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generatePdfPreviews } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type Invoice = Database['public']['Tables']['invoices']['Row'];

/**
 * Hook to automatically convert Gmail PDF invoices to images in the background
 * This runs once per session and converts any PDFs that haven't been converted yet
 */
export const useConvertGmailPdfs = (userId: string | undefined, enabled: boolean = true) => {
  const hasRun = useRef(false);
  const isConverting = useRef(false);

  useEffect(() => {
    // Only run once per session and only if enabled
    if (!enabled || !userId || hasRun.current || isConverting.current) {
      return;
    }

    const convertPdfsInBackground = async () => {
      try {
        isConverting.current = true;
        console.log('🔄 Checking for Gmail PDFs to convert...');

        // Find invoices that:
        // 1. Have a file_path ending in .pdf (stored as PDF)
        // 2. Don't have preview_image_url (not converted yet)
        // 3. Have file_source = 'gmail_attachment' or 'gmail_external_link'
        const { data: pdfInvoices, error: fetchError } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', userId)
          .or('file_source.eq.gmail_attachment,file_source.eq.gmail_external_link')
          .is('preview_image_url', null)
          .ilike('file_path', '%.pdf')
          .limit(10); // Convert max 10 PDFs per session to avoid overload

        if (fetchError) {
          console.error('❌ Error fetching PDF invoices:', fetchError);
          return;
        }

        if (!pdfInvoices || pdfInvoices.length === 0) {
          console.log('✅ No Gmail PDFs need conversion');
          return;
        }

        console.log(`📄 Found ${pdfInvoices.length} Gmail PDFs to convert`);

        // Convert each PDF
        for (const invoice of pdfInvoices) {
          try {
            await convertInvoicePdfToImages(invoice);
          } catch (error) {
            console.error(`❌ Failed to convert invoice ${invoice.id}:`, error);
            // Continue with next invoice even if this one fails
          }
        }

        console.log('✅ Finished converting Gmail PDFs');
      } catch (error) {
        console.error('❌ Error in PDF conversion background task:', error);
      } finally {
        isConverting.current = false;
        hasRun.current = true;
      }
    };

    // Run conversion in background after a small delay
    const timeoutId = setTimeout(() => {
      convertPdfsInBackground();
    }, 2000); // Wait 2 seconds after component mount

    return () => clearTimeout(timeoutId);
  }, [userId, enabled]);
};

/**
 * Convert a single invoice PDF to images
 */
async function convertInvoicePdfToImages(invoice: Invoice) {
  console.log(`🔄 Converting invoice ${invoice.id} (${invoice.file_path})...`);

  try {
    // Download the PDF from storage
    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from('invoices')
      .download(invoice.file_path!);

    if (downloadError || !pdfBlob) {
      console.error(`❌ Failed to download PDF for invoice ${invoice.id}:`, downloadError);
      return;
    }

    // Convert Blob to File (required by generatePdfPreviews)
    const pdfFile = new File([pdfBlob], invoice.file_path || 'invoice.pdf', {
      type: 'application/pdf',
    });

    console.log(`📄 Generating previews for invoice ${invoice.id}...`);

    // Use the same PDF.js conversion as manual upload
    const pageBlobs = await generatePdfPreviews(pdfFile);

    if (!pageBlobs || pageBlobs.length === 0) {
      console.error(`❌ No page blobs generated for invoice ${invoice.id}`);
      return;
    }

    console.log(`✅ Generated ${pageBlobs.length} page images for invoice ${invoice.id}`);

    // Upload each page as a PNG
    const imageUrls: string[] = [];

    for (let pageIndex = 0; pageIndex < pageBlobs.length; pageIndex++) {
      const blob = pageBlobs[pageIndex];
      const fileName = `${invoice.user_id}/${Date.now()}_${invoice.id}_page${pageIndex + 1}.png`;

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) {
        console.error(`❌ Failed to upload page ${pageIndex + 1}:`, uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(fileName);
      imageUrls.push(urlData.publicUrl);

      console.log(`✅ Uploaded page ${pageIndex + 1}/${pageBlobs.length}`);
    }

    if (imageUrls.length === 0) {
      console.error(`❌ No images uploaded for invoice ${invoice.id}`);
      return;
    }

    // Update the invoice with the new image URLs
    const [mainImageUrl, ...additionalImages] = imageUrls;

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        image_url: mainImageUrl,
        preview_image_url: mainImageUrl,
        additional_images: additionalImages,
      })
      .eq('id', invoice.id);

    if (updateError) {
      console.error(`❌ Failed to update invoice ${invoice.id}:`, updateError);
      return;
    }

    console.log(`✅ Successfully converted invoice ${invoice.id} to ${imageUrls.length} images`);
  } catch (error) {
    console.error(`❌ Error converting invoice ${invoice.id}:`, error);
    throw error;
  }
}
