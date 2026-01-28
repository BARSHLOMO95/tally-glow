import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ExternalLink, FileText, ImageOff } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const ImageModal = ({ imageUrl, isOpen, onClose }: ImageModalProps) => {
  const [imageError, setImageError] = useState(false);

  if (!imageUrl) return null;

  const isPdf = imageUrl.toLowerCase().endsWith('.pdf') || imageUrl.toLowerCase().includes('.pdf');
  
  // Check if it's a known image format
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const isKnownImage = imageExtensions.some(ext => imageUrl.toLowerCase().includes(ext));
  
  // If not PDF and not a known image extension, try to display as image anyway
  // Many URLs don't have extensions but are still images
  const shouldTryAsImage = !isPdf;

  const handleDownload = () => {
    window.open(imageUrl, '_blank');
  };

  const handleOpenInNewTab = () => {
    window.open(imageUrl, '_blank');
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Reset error state when URL changes
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setImageError(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-4xl p-0 bg-black/90 border-none">
        <DialogTitle className="sr-only">תצוגת מסמך</DialogTitle>
        <DialogDescription className="sr-only">תצוגה מקדימה של המסמך או התמונה</DialogDescription>
        <div className="relative">
          <div className="absolute top-2 left-2 z-10 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 hover:bg-black/70 text-white"
              onClick={handleOpenInNewTab}
              title="פתח בחלון חדש"
            >
              <ExternalLink className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 hover:bg-black/70 text-white"
              onClick={handleDownload}
              title="הורד"
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 hover:bg-black/70 text-white"
              onClick={onClose}
              title="סגור"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          {isPdf ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
              <FileText className="h-24 w-24 text-white/60 mb-4" />
              <p className="text-white text-lg mb-4 text-center">קובץ PDF</p>
              <div className="flex gap-3 mb-6">
                <Button
                  variant="secondary"
                  onClick={handleOpenInNewTab}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  פתח ב-PDF Viewer
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="gap-2 text-white border-white/30 hover:bg-white/10"
                >
                  <Download className="h-4 w-4" />
                  הורד
                </Button>
              </div>
              
              {/* Embed the PDF */}
              <iframe
                src={imageUrl}
                className="w-full h-[50vh] rounded-lg border border-white/20"
                title="PDF Preview"
              />
            </div>
          ) : shouldTryAsImage && !imageError ? (
            <img
              src={imageUrl}
              alt="תמונת חשבונית"
              className="w-full max-h-[80vh] object-contain"
              onError={handleImageError}
            />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[40vh] p-8">
              <ImageOff className="h-16 w-16 text-white/60 mb-4" />
              <p className="text-white text-lg mb-4 text-center">לא ניתן להציג את הקובץ</p>
              <Button
                variant="secondary"
                onClick={handleOpenInNewTab}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                פתח בחלון חדש
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageModal;
