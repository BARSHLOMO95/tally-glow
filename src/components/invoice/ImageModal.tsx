import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ExternalLink, FileText } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const ImageModal = ({ imageUrl, isOpen, onClose }: ImageModalProps) => {
  if (!imageUrl) return null;

  const isPdf = imageUrl.toLowerCase().endsWith('.pdf') || imageUrl.toLowerCase().includes('.pdf');
  const isExternalLink = !imageUrl.includes('supabase.co/storage');

  const handleDownload = () => {
    window.open(imageUrl, '_blank');
  };

  const handleOpenInNewTab = () => {
    window.open(imageUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
              <div className="flex gap-3">
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
              
              {/* Also try to embed the PDF */}
              <iframe
                src={imageUrl}
                className="w-full h-[50vh] mt-6 rounded-lg border border-white/20"
                title="PDF Preview"
              />
            </div>
          ) : isExternalLink ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
              <ExternalLink className="h-24 w-24 text-white/60 mb-4" />
              <p className="text-white text-lg mb-4 text-center">קישור חיצוני</p>
              <Button
                variant="secondary"
                onClick={handleOpenInNewTab}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                פתח קישור
              </Button>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt="תמונת חשבונית"
              className="w-full max-h-[80vh] object-contain"
              onError={(e) => {
                // If image fails to load, show a fallback
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement?.classList.add('min-h-[40vh]', 'flex', 'items-center', 'justify-center');
                const fallback = document.createElement('div');
                fallback.className = 'text-white text-center';
                fallback.innerHTML = `
                  <p class="mb-4">לא ניתן להציג את התמונה</p>
                  <button onclick="window.open('${imageUrl}', '_blank')" class="px-4 py-2 bg-white/20 rounded hover:bg-white/30">
                    פתח בחלון חדש
                  </button>
                `;
                target.parentElement?.appendChild(fallback);
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageModal;
