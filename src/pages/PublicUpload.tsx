import { useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { FileText, Upload, Loader2, Check, Lock, Image, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generatePdfPreviews } from '@/lib/utils';

const PublicUpload = () => {
  const { linkCode } = useParams<{ linkCode: string }>();
  const [searchParams] = useSearchParams();
  
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [linkData, setLinkData] = useState<any>(null);
  
  const [files, setFiles] = useState<File[]>([]);
  const [previewBlobs, setPreviewBlobs] = useState<Map<number, Blob[]>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const generatePreviewsForFiles = async (newFiles: File[], startIndex: number) => {
    const newPreviewBlobs = new Map(previewBlobs);

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const fileIndex = startIndex + i;

      if (file.type === 'application/pdf') {
        try {
          const blobs = await generatePdfPreviews(file);
          newPreviewBlobs.set(fileIndex, blobs);
        } catch (error) {
          console.error(`Error generating preview for ${file.name}:`, error);
        }
      }
    }

    setPreviewBlobs(newPreviewBlobs);
  };

  const verifyPassword = async () => {
    if (!password.trim()) {
      toast.error('נא להזין סיסמה');
      return;
    }

    setIsVerifying(true);

    try {
      // Call edge function to verify password
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-upload-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            link_code: linkCode,
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'סיסמה שגויה');
        return;
      }

      setLinkData(data);
      setIsAuthenticated(true);
      toast.success('אימות הצליח!');
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('שגיאה באימות');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(
        file => file.type.startsWith('image/') || file.type === 'application/pdf'
      );
      setFiles(prev => {
        const startIndex = prev.length;
        generatePreviewsForFiles(newFiles, startIndex);
        return [...prev, ...newFiles];
      });
    }
  }, [previewBlobs]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(
        file => file.type.startsWith('image/') || file.type === 'application/pdf'
      );
      setFiles(prev => {
        const startIndex = prev.length;
        generatePreviewsForFiles(newFiles, startIndex);
        return [...prev, ...newFiles];
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewBlobs(prev => {
      const newMap = new Map(prev);
      newMap.delete(index);
      // Reindex remaining preview blobs
      const reindexedMap = new Map();
      Array.from(newMap.entries()).forEach(([oldIndex, blob]) => {
        const newIndex = oldIndex > index ? oldIndex - 1 : oldIndex;
        reindexedMap.set(newIndex, blob);
      });
      return reindexedMap;
    });
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('נא לבחור קבצים להעלאה');
      return;
    }

    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isPdf = file.type === 'application/pdf';
        const pdfBlobs = isPdf ? previewBlobs.get(i) : null;

        let mainImageUrl: string;
        let additionalImageUrls: string[] = [];

        // If it's a PDF with multiple pages, upload each page separately
        if (isPdf && pdfBlobs && pdfBlobs.length > 0) {
          console.log(`✅ Uploading ${pdfBlobs.length} PDF pages as separate images`);

          for (let pageIndex = 0; pageIndex < pdfBlobs.length; pageIndex++) {
            const blob = pdfBlobs[pageIndex];
            const fileName = `${linkData.user_id}/${Date.now()}_${i}_page${pageIndex + 1}.png`;

            const { error: uploadError } = await supabase.storage
              .from('invoices')
              .upload(fileName, blob);

            if (uploadError) {
              console.error('Upload error:', uploadError);
              toast.error(`שגיאה בהעלאת עמוד ${pageIndex + 1} של ${file.name}`);
              continue;
            }

            const { data: urlData } = supabase.storage
              .from('invoices')
              .getPublicUrl(fileName);

            if (pageIndex === 0) {
              mainImageUrl = urlData.publicUrl;
            } else {
              additionalImageUrls.push(urlData.publicUrl);
            }

            console.log(`📤 Uploaded page ${pageIndex + 1}/${pdfBlobs.length}`);
          }
        } else {
          // Regular image upload
          console.log('📸 Uploading single image');
          const fileExtension = file.name.split('.').pop() || 'jpg';
          const fileName = `${linkData.user_id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

          const { error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            toast.error(`שגיאה בהעלאת ${file.name}`);
            continue;
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

        // STEP 1: Create the invoice record directly with additional_images
        const { data: newInvoice, error: createError } = await supabase
          .from('invoices')
          .insert([{
            user_id: linkData.user_id,
            intake_date: new Date().toISOString(),
            status: 'חדש',
            image_url: mainImageUrl,
            preview_image_url: mainImageUrl,
            additional_images: additionalImageUrls.length > 0 ? additionalImageUrls : null,
            entry_method: 'דיגיטלי'
          }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating invoice:', createError);
          toast.error(`שגיאה ביצירת חשבונית עבור ${file.name}`);
          continue;
        }

        console.log('✅ Invoice created with additional_images:', {
          id: newInvoice.id,
          additional_images_count: newInvoice.additional_images?.length || 0
        });

        // STEP 2: Call AI analysis in background to populate fields (don't wait)
        supabase.functions.invoke('import-invoices', {
          body: {
            invoice_id: newInvoice.id,  // Send the invoice ID to update
            image_url: mainImageUrl,
            user_id: linkData.user_id,
            additional_images: additionalImageUrls  // Send additional images to preserve them
          }
        }).then(({ error }) => {
          if (error) {
            console.error('Error in background analysis:', error);
          } else {
            console.log('✅ Invoice analysis completed in background');
          }
        });
      }

      setUploadSuccess(true);
      toast.success('הקבצים הועלו בהצלחה!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('שגיאה בהעלאת הקבצים');
    } finally {
      setIsUploading(false);
    }
  };

  // Password verification screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md shadow-xl border-border/50 bg-card/80 backdrop-blur">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">העלאת חשבוניות</CardTitle>
              <CardDescription>הזינו את הסיסמה כדי להעלות קבצים</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">סיסמה</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="הזינו סיסמה"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <Button 
                onClick={verifyPassword} 
                className="w-full bg-gradient-to-r from-primary to-purple-600"
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Lock className="w-4 h-4 ml-2" />
                )}
                אימות
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Upload success screen
  if (uploadSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md shadow-xl border-border/50 bg-card/80 backdrop-blur text-center">
            <CardHeader className="space-y-4">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl">הועלה בהצלחה!</CardTitle>
              <CardDescription className="text-base">
                {files.length} קבצים הועלו ונשלחו לעיבוד
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  setFiles([]);
                  setPreviewBlobs(new Map());
                  setUploadSuccess(false);
                }}
                variant="outline"
                className="w-full"
              >
                העלה קבצים נוספים
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Upload screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="shadow-xl border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">העלאת חשבוניות</CardTitle>
            <CardDescription>
              {linkData?.name && <span className="block font-medium text-foreground">{linkData.name}</span>}
              גררו קבצים לכאן או לחצו לבחירה
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${dragActive 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }
              `}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Image className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                גררו תמונות או PDF לכאן
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                או לחצו לבחירת קבצים
              </p>
            </div>

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="space-y-2">
                <Label>קבצים נבחרים ({files.length})</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {files.map((file, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="truncate text-sm">{file.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-8 w-8"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <Button 
              onClick={uploadFiles}
              className="w-full bg-gradient-to-r from-primary to-purple-600"
              disabled={isUploading || files.length === 0}
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  מעלה...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 ml-2" />
                  העלה {files.length > 0 ? `(${files.length})` : ''}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PublicUpload;
