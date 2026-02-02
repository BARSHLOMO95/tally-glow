import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ExternalLink, FileText, ImageOff, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string | null;
  previewImageUrl?: string | null; // Preview image for PDFs
  additionalImages?: string[] | null; // Additional images for multi-page PDFs
  isOpen: boolean;
  onClose: () => void;
}

const ImageModal = ({ imageUrl, previewImageUrl, additionalImages, isOpen, onClose }: ImageModalProps) => {
  const [imageError, setImageError] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  if (!imageUrl && !previewImageUrl) return null;

  const isPdf = imageUrl?.toLowerCase().endsWith('.pdf') || imageUrl?.toLowerCase().includes('.pdf');

  // Build array of all images to display
  const displayUrl = previewImageUrl || imageUrl;
  const allImages = displayUrl ? [displayUrl, ...(additionalImages || [])] : [];
  const totalPages = allImages.length;
  const hasMultiplePages = totalPages > 1;
  
  // Check if it's a known image format
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const isKnownImage = displayUrl ? imageExtensions.some(ext => displayUrl.toLowerCase().includes(ext)) : false;
  
  // If not PDF and not a known image extension, try to display as image anyway
  const shouldTryAsImage = !isPdf || hasPreviewImage;

  const handleDownload = () => {
    if (imageUrl) window.open(imageUrl, '_blank');
  };

  const handleOpenInNewTab = () => {
    if (imageUrl) window.open(imageUrl, '_blank');
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setImageError(false);
      setShowPdfViewer(false);
      setCurrentPage(0);
      onClose();
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Current image to display
  const currentImageUrl = allImages[currentPage] || displayUrl;
  const hasPreviewImage = !imageError && currentImageUrl;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-4xl p-0 bg-black/90 border-none">
        <DialogTitle className="sr-only">תצוגת מסמך</DialogTitle>
        <DialogDescription className="sr-only">תצוגה מקדימה של המסמך או התמונה</DialogDescription>
        <div className="relative">
          <div className="absolute top-2 left-2 z-10 flex gap-2">
            {/* Show PDF viewer toggle button only for PDFs with preview */}
            {isPdf && hasPreviewImage && !showPdfViewer && (
              <Button
                variant="ghost"
                size="sm"
                className="bg-black/50 hover:bg-black/70 text-white text-xs"
                onClick={() => setShowPdfViewer(true)}
                title="פתח PDF מלא"
              >
                <FileText className="h-4 w-4 mr-1" />
                PDF מלא
              </Button>
            )}
            {showPdfViewer && (
              <Button
                variant="ghost"
                size="sm"
                className="bg-black/50 hover:bg-black/70 text-white text-xs"
                onClick={() => setShowPdfViewer(false)}
                title="חזור לתצוגה מקדימה"
              >
                תצוגה מקדימה
              </Button>
            )}
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
          
          {/* Show PDF viewer if explicitly requested */}
          {showPdfViewer && isPdf && imageUrl ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
              <iframe
                src={imageUrl}
                className="w-full h-[70vh] rounded-lg border border-white/20"
                title="PDF Preview"
              />
            </div>
          ) : isPdf && !hasPreviewImage ? (
            // PDF without preview - show PDF viewer as fallback
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
              
              <iframe
                src={imageUrl || ''}
                className="w-full h-[50vh] rounded-lg border border-white/20"
                title="PDF Preview"
              />
            </div>
          ) : shouldTryAsImage && currentImageUrl && !imageError ? (
            // Show preview image (for PDFs) or regular image
            <div className="relative">
              <img
                src={currentImageUrl}
                alt={`תמונת חשבונית - עמוד ${currentPage + 1} מתוך ${totalPages}`}
                className="w-full max-h-[80vh] object-contain"
                onError={handleImageError}
              />

              {/* Page navigation for multi-page documents */}
              {hasMultiplePages && (
                <>
                  {/* Navigation buttons */}
                  <div className="absolute inset-y-0 left-2 flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-black/50 hover:bg-black/70 text-white disabled:opacity-30"
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages - 1}
                      title="עמוד הבא"
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </Button>
                  </div>

                  <div className="absolute inset-y-0 right-2 flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-black/50 hover:bg-black/70 text-white disabled:opacity-30"
                      onClick={handlePrevPage}
                      disabled={currentPage <= 0}
                      title="עמוד קודם"
                    >
                      <ChevronRight className="h-8 w-8" />
                    </Button>
                  </div>

                  {/* Page indicator */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
                      עמוד {currentPage + 1} מתוך {totalPages}
                    </div>
                  </div>
                </>
              )}
            </div>
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
