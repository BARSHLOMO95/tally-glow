import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Image, Upload, X, AlertTriangle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { generatePdfPreviews } from '@/lib/utils';

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  existingCategories: string[];
}

const AddInvoiceModal = ({ isOpen, onClose, onSave }: AddInvoiceModalProps) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewBlobs, setPreviewBlobs] = useState<Blob[]>([]);
  const { canUploadDocument, getRemainingDocuments, subscription, plan } = useSubscription();
  
  const remaining = getRemainingDocuments();
  const isLimitReached = !canUploadDocument();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate it's an image or PDF
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    console.log('📁 File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      isImage,
      isPdf
    });

    if (!isImage && !isPdf) {
      toast.error('יש להעלות קובץ תמונה או PDF בלבד');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('גודל הקובץ חייב להיות עד 10MB');
      return;
    }

    setUploadedFile(file);

    // Generate preview for PDFs or use image directly
    if (isPdf) {
      console.log('🔄 Starting PDF preview generation...');
      try {
        toast.loading('יוצר תצוגה מקדימה...', { id: 'pdf-preview' });
        const blobs = await generatePdfPreviews(file);
        console.log(`✅ PDF preview generated successfully: ${blobs.length} pages`);

        const urls = blobs.map(blob => URL.createObjectURL(blob));
        setPreviewBlobs(blobs);
        setPreviewUrls(urls);
        toast.success(`${blobs.length} עמודים הומרו בהצלחה`, { id: 'pdf-preview' });
      } catch (error) {
        console.error('❌ Error generating PDF preview:', error);
        toast.error('שגיאה ביצירת תצוגה מקדימה. נסה שוב או העלה תמונה רגילה.', { id: 'pdf-preview' });
        setPreviewUrls([]);
        setPreviewBlobs([]);
      }
    } else {
      console.log('📸 Using image directly (no conversion needed)');
      setPreviewUrls([URL.createObjectURL(file)]);
      setPreviewBlobs([]);
    }
  };

  const handleSubmit = async () => {
    console.log('🚀 handleSubmit called - START');

    if (!uploadedFile) {
      toast.error('יש להעלות תמונה תחילה');
      return;
    }

    const isPdf = uploadedFile.type === 'application/pdf';

    // CRITICAL: Block PDF upload if preview was not generated
    if (isPdf && previewBlobs.length === 0) {
      console.error('❌ BLOCKED: Cannot upload PDF without preview images');
      toast.error('לא ניתן להעלות PDF - ההמרה לתמונה נכשלה. נסה שוב או העלה תמונה רגילה.');
      setIsUploading(false);
      return;
    }

    // Prevent double submission
    if (isUploading) {
      console.warn('⚠️ Already uploading, ignoring duplicate call');
      return;
    }

    setIsUploading(true);
    console.log('🔒 Upload started, isUploading set to true');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('יש להתחבר כדי להעלות חשבוניות');
        return;
      }

      console.log('📄 Upload Info:', {
        fileName: uploadedFile.name,
        fileType: uploadedFile.type,
        isPdf,
        numberOfPages: previewBlobs.length
      });

      let mainImageUrl: string;
      let additionalImageUrls: string[] = [];

      // If it's a PDF with multiple pages, upload each page separately
      if (isPdf && previewBlobs.length > 0) {
        console.log(`✅ Uploading ${previewBlobs.length} PDF pages as separate images`);

        for (let i = 0; i < previewBlobs.length; i++) {
          const blob = previewBlobs[i];
          const fileName = `${user.id}/${Date.now()}_page${i + 1}.png`;

          const { error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(fileName, blob);

          if (uploadError) {
            throw uploadError;
          }

          const { data: urlData } = supabase.storage
            .from('invoices')
            .getPublicUrl(fileName);

          if (i === 0) {
            mainImageUrl = urlData.publicUrl;
          } else {
            additionalImageUrls.push(urlData.publicUrl);
          }

          console.log(`📤 Uploaded page ${i + 1}/${previewBlobs.length}`);
        }
      } else {
        // Regular image upload
        console.log('📸 Uploading single image');
        const fileExtension = uploadedFile.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(fileName, uploadedFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('invoices')
          .getPublicUrl(fileName);

        mainImageUrl = urlData.publicUrl;
      }

      console.log('📤 Creating invoice with additional_images:', {
        mainImageUrl,
        additionalImagesCount: additionalImageUrls.length,
        additionalImages: additionalImageUrls
      });

      const invoiceToCreate = {
        user_id: user.id,
        intake_date: new Date().toISOString(),
        status: 'חדש',
        image_url: mainImageUrl,
        preview_image_url: mainImageUrl,
        additional_images: additionalImageUrls.length > 0 ? additionalImageUrls : null,
        entry_method: 'דיגיטלי'
      };

      console.log('📝 ABOUT TO INSERT INVOICE:', JSON.stringify(invoiceToCreate, null, 2));

      // STEP 1: Create the invoice record directly with additional_images
      const { data: newInvoice, error: createError } = await supabase
        .from('invoices')
        .insert([invoiceToCreate])
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating invoice:', createError);
        throw createError;
      }

      console.log('✅ Invoice created with ID:', newInvoice.id);
      console.log('✅ Invoice created with additional_images:', {
        id: newInvoice.id,
        additional_images_count: newInvoice.additional_images?.length || 0,
        full_invoice: newInvoice
      });

      console.log('🔹 About to call Edge Function for AI analysis');

      // STEP 2: Call AI analysis and WAIT for it to complete
      const edgeFunctionPayload = {
        invoice_id: newInvoice.id,  // Send the invoice ID to update
        image_url: mainImageUrl,
        user_id: user.id,
        additional_images: additionalImageUrls  // Send additional images to preserve them
      };

      console.log('📤 Calling Edge Function with payload:', JSON.stringify(edgeFunctionPayload));

      // Show loading toast
      toast.loading('המערכת מנתחת את החשבונית...', { id: 'ai-analysis' });

      try {
        const { data, error } = await supabase.functions.invoke('import-invoices', {
          body: edgeFunctionPayload
        });

        if (error) {
          console.error('❌ Error in AI analysis:', error);
          toast.error('החשבונית נשמרה אך הניתוח נכשל', { id: 'ai-analysis' });
        } else {
          console.log('✅ AI analysis completed successfully:', data);
          console.log('✅ Operation:', data?.operation, 'Updated:', data?.updated, 'Inserted:', data?.inserted);
          console.log('✅ Invoice ID from response:', data?.invoice_id);
          toast.success('החשבונית נשמרה וניתחה בהצלחה!', { id: 'ai-analysis' });
        }
      } catch (err) {
        console.error('❌ Exception in Edge Function call:', err);
        toast.error('החשבונית נשמרה אך הניתוח נכשל', { id: 'ai-analysis' });
      }

      console.log('🔹 AI analysis finished, calling onSave()');
      await onSave(); // Wait for refresh to complete
      console.log('🔹 onSave() completed, calling handleClose()');
      handleClose();
      console.log('🔹 handleClose() called - END of handleSubmit');

    } catch (error) {
      console.error('Error uploading invoice:', error);
      toast.error('שגיאה בהעלאת החשבונית');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setUploadedFile(null);
    setPreviewUrls([]);
    setPreviewBlobs([]);
    onClose();
  };

  const removeFile = () => {
    setUploadedFile(null);
    setPreviewUrls([]);
    setPreviewBlobs([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-[95vw] sm:w-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">הוספת חשבונית</DialogTitle>
          <DialogDescription>
            העלה תמונת חשבונית והמערכת תנתח אותה אוטומטית
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isLimitReached ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="p-4 rounded-full bg-destructive/10">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
              <div>
                <p className="text-lg font-medium">הגעת למגבלת המסמכים החודשית</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {subscription?.status === 'active' 
                    ? `מגבלת התוכנית שלך היא ${plan?.document_limit} מסמכים בחודש`
                    : 'בתוכנית החינמית ניתן להעלות עד 10 מסמכים בחודש'
                  }
                </p>
              </div>
              <Button 
                onClick={() => {
                  handleClose();
                  navigate('/pricing');
                }}
                className="mt-2"
              >
                שדרג עכשיו
              </Button>
            </div>
          ) : uploadedFile ? (
            <div className="space-y-4">
              <div className="relative">
                {previewUrls.length > 0 ? (
                  <div className="space-y-3">
                    {previewUrls.length > 1 && (
                      <p className="text-sm font-medium text-center">
                        {previewUrls.length} עמודים
                      </p>
                    )}
                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="relative">
                          {previewUrls.length > 1 && (
                            <span className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-10">
                              עמוד {index + 1}
                            </span>
                          )}
                          <img
                            src={url}
                            alt={`עמוד ${index + 1}`}
                            className="w-full object-contain rounded-lg border bg-muted"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 rounded-lg border bg-muted">
                    <FileText className="h-16 w-16 text-red-500 mb-2" />
                    <p className="text-sm font-medium">מעבד PDF...</p>
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 left-2 h-8 w-8 z-20"
                  onClick={removeFile}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {uploadedFile?.name}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                נותרו {remaining === Infinity ? '∞' : remaining} מסמכים החודש
              </p>
            </div>
          ) : (
            <div 
              className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex gap-2 mb-4">
                <Image className="h-10 w-10 text-muted-foreground" />
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-base font-medium mb-1">לחץ להעלאת תמונה או PDF</p>
              <p className="text-sm text-muted-foreground">או צלם חשבונית מהמצלמה</p>
              <p className="text-xs text-muted-foreground mt-2">
                נותרו {remaining === Infinity ? '∞' : remaining} מסמכים החודש
              </p>
            </div>
          )}
        </div>

        {!isLimitReached && (
          <div className="flex gap-3 mt-6 justify-end">
            <Button variant="outline" onClick={handleClose} disabled={isUploading}>
              <X className="h-4 w-4 ml-1" />
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!uploadedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 ml-1 animate-spin" />
                  מעלה...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 ml-1" />
                  שלח לניתוח
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddInvoiceModal;
