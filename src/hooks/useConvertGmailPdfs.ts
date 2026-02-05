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
  const isConverting = useRef(false);
  const lastRunAt = useRef<number>(0);
  const intervalIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !userId) return;

    const convertPdfsInBackground = async () => {
      // Throttle: don’t run too frequently (helps avoid hammering storage/pdf.js)
      const now = Date.now();
      if (isConverting.current) return;
      if (now - lastRunAt.current < 60_000) return; // 1 minute

      try {
        isConverting.current = true;
        lastRunAt.current = now;
        console.log('🔄 Checking for Gmail PDFs to convert...');

        // Find invoices that:
        // 1. Have an image_url ending in .pdf (stored as PDF)
        // 2. Don't have preview_image_url (not converted yet)
        // 3. Have file_source = 'gmail_attachment' or 'gmail_external_link'
        const { data: pdfInvoices, error: fetchError } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', userId)
          .or('file_source.eq.gmail_attachment,file_source.eq.gmail_external_link')
          .is('preview_image_url', null)
          .ilike('image_url', '%.pdf')
          .order('created_at', { ascending: false })
          .limit(5); // small batches, repeated over time

        if (fetchError) {
          console.error('❌ Error fetching PDF invoices:', fetchError);
          return;
        }

        if (!pdfInvoices || pdfInvoices.length === 0) {
          console.log('✅ No Gmail PDFs need conversion');
          return;
        }

        console.log(`📄 Found ${pdfInvoices.length} Gmail PDFs to convert`);

        for (const invoice of pdfInvoices) {
          try {
            await convertInvoicePdfToImages(invoice);
          } catch (error) {
            console.error(`❌ Failed to convert invoice ${invoice.id}:`, error);
          }
        }

        console.log('✅ Finished converting Gmail PDFs');
      } catch (error) {
        console.error('❌ Error in PDF conversion background task:', error);
      } finally {
        isConverting.current = false;
      }
    };

    // Initial run shortly after mount
    const timeoutId = window.setTimeout(() => {
      convertPdfsInBackground();
    }, 2000);

    // Keep checking for new Gmail PDFs during the session
    intervalIdRef.current = window.setInterval(() => {
      convertPdfsInBackground();
    }, 60_000);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalIdRef.current) window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    };
  }, [userId, enabled]);
};

/**
 * Convert a single invoice PDF to images
 */
async function convertInvoicePdfToImages(invoice: Invoice) {
  // Extract file path from image_url - it's the storage path
  const imageUrl = invoice.image_url;
  if (!imageUrl) {
    console.error(`❌ No image_url for invoice ${invoice.id}`);
    return;
  }

  // Extract the file path from the public URL
  // URL format: https://{project}.supabase.co/storage/v1/object/public/invoices/{user_id}/{filename}
  const urlParts = imageUrl.split('/invoices/');
  const filePath = urlParts.length > 1 ? urlParts[1] : null;

  if (!filePath) {
    console.error(`❌ Could not extract file path from URL: ${imageUrl}`);
    return;
  }

  console.log(`🔄 Converting invoice ${invoice.id} (${filePath})...`);

  try {
    // Download the PDF from storage
    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from('invoices')
      .download(filePath);

    if (downloadError || !pdfBlob) {
      console.error(`❌ Failed to download PDF for invoice ${invoice.id}:`, downloadError);
      return;
    }

    // Convert Blob to File (required by generatePdfPreviews)
    const pdfFile = new File([pdfBlob], invoice.file_name || 'invoice.pdf', {
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
