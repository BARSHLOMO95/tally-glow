import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Image, Upload, X, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Changed to just refresh the list
  existingCategories: string[];
}

const AddInvoiceModal = ({ isOpen, onClose, onSave }: AddInvoiceModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      toast.error('יש להעלות קובץ תמונה בלבד');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('גודל הקובץ חייב להיות עד 10MB');
      return;
    }

    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsSuccess(false);
  };

  const handleSubmit = async () => {
    if (!uploadedFile) {
      toast.error('יש להעלות תמונה תחילה');
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

      // Upload image to storage
      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, uploadedFile);

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
        body: { image_url: imageUrl, user_id: user.id }
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
    setIsSuccess(false);
    onClose();
  };

  const removeFile = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
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
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
              <p className="text-lg font-medium">החשבונית נשלחה בהצלחה!</p>
              <p className="text-sm text-muted-foreground">המערכת מנתחת את הנתונים</p>
            </div>
          ) : previewUrl ? (
            <div className="space-y-4">
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt="תצוגה מקדימה" 
                  className="w-full max-h-64 object-contain rounded-lg border bg-muted"
                />
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
            </div>
          ) : (
            <div 
              className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-base font-medium mb-1">לחץ להעלאת תמונה</p>
              <p className="text-sm text-muted-foreground">או צלם חשבונית מהמצלמה</p>
            </div>
          )}
        </div>

        {!isSuccess && (
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
