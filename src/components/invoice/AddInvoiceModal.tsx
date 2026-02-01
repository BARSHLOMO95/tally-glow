import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Image, Upload, X, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { generatePdfPreview } from '@/lib/utils';

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
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
    setIsSuccess(false);

    // Generate preview for PDFs or use image directly
    if (isPdf) {
      console.log('🔄 Starting PDF preview generation...');
      try {
        toast.loading('יוצר תצוגה מקדימה...', { id: 'pdf-preview' });
        const blob = await generatePdfPreview(file);
        console.log('✅ PDF preview generated successfully:', {
          blobSize: blob.size,
          blobType: blob.type
        });
        setPreviewBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        toast.success('תצוגה מקדימה נוצרה בהצלחה', { id: 'pdf-preview' });
      } catch (error) {
        console.error('❌ Error generating PDF preview:', error);
        toast.error('שגיאה ביצירת תצוגה מקדימה', { id: 'pdf-preview' });
        setPreviewUrl(null);
        setPreviewBlob(null);
      }
    } else {
      console.log('📸 Using image directly (no conversion needed)');
      setPreviewUrl(URL.createObjectURL(file));
      setPreviewBlob(null);
    }
  };

  const handleSubmit = async () => {
    if (!uploadedFile) {
      toast.error('יש להעלות תמונה תחילה');
      return;
    }

    const isPdf = uploadedFile.type === 'application/pdf';

    // CRITICAL: Block PDF upload if preview was not generated
    if (isPdf && !previewBlob) {
      console.error('❌ BLOCKED: Cannot upload PDF without preview image');
      toast.error('לא ניתן להעלות PDF - ההמרה לתמונה נכשלה. נסה שוב או העלה תמונה רגילה.');
      setIsUploading(false);
      return;
    }

    setIsUploading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('יש להתחבר כדי להעלות חשבוניות');
        return;
      }

      let fileToUpload: File | Blob;
      let fileExtension: string;

      console.log('📄 Upload Info:', {
        fileName: uploadedFile.name,
        fileType: uploadedFile.type,
        isPdf,
        hasPreviewBlob: !!previewBlob
      });

      // If it's a PDF with a preview, upload only the preview image
      if (isPdf && previewBlob) {
        console.log('✅ Using PDF preview image for upload');
        fileToUpload = previewBlob;
        fileExtension = 'png';
      } else {
        console.log('📸 Using original image for upload');
        fileToUpload = uploadedFile;
        fileExtension = uploadedFile.name.split('.').pop() || 'jpg';
      }

      // Upload the file (either original image or PDF converted to image)
      const fileName = `${user.id}/${Date.now()}.${fileExtension}`;
      console.log('📤 Uploading as:', fileName);

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, fileToUpload);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Call import-invoices to analyze and save
      const { error } = await supabase.functions.invoke('import-invoices', {
        body: {
          image_url: imageUrl,
          user_id: user.id
        }
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast.success('החשבונית נשלחה לניתוח בהצלחה!');

      // Refresh the invoice list
      onSave();

      // Close after a short delay to show success state
      setTimeout(() => {
        handleClose();
      }, 1500);

    } catch (error) {
      console.error('Error uploading invoice:', error);
      toast.error('שגיאה בהעלאת החשבונית');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setPreviewBlob(null);
    setIsSuccess(false);
    onClose();
  };

  const removeFile = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setPreviewBlob(null);
    setIsSuccess(false);
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
          ) : isSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
              <p className="text-lg font-medium">החשבונית נשלחה בהצלחה!</p>
              <p className="text-sm text-muted-foreground">המערכת מנתחת את הנתונים</p>
            </div>
          ) : uploadedFile ? (
            <div className="space-y-4">
              <div className="relative">
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="תצוגה מקדימה" 
                    className="w-full max-h-64 object-contain rounded-lg border bg-muted"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 rounded-lg border bg-muted">
                    <FileText className="h-16 w-16 text-red-500 mb-2" />
                    <p className="text-sm font-medium">קובץ PDF</p>
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 left-2 h-8 w-8"
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

        {!isSuccess && !isLimitReached && (
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
                  מעלה ומנתח...
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
