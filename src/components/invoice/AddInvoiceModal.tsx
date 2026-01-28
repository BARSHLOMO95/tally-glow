import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InvoiceFormData, InvoiceStatus, BusinessType, EntryMethod } from '@/types/invoice';
import { Plus, X, Upload, Loader2, Image } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: InvoiceFormData) => void;
  existingCategories: string[];
}

const statusOptions: InvoiceStatus[] = ['חדש', 'בתהליך', 'טופל'];
const businessTypeOptions: BusinessType[] = ['עוסק מורשה', 'עוסק פטור', 'חברה בע"מ', 'ספק חו"ל'];
const entryMethodOptions: EntryMethod[] = ['ידני', 'דיגיטלי'];
const documentTypeOptions = ['חשבונית מס', 'חשבונית מס קבלה', 'קבלה'];

const defaultCategories = ['תקשורת', 'סופרים', 'משרד', 'שירותים', 'ציוד', 'אחר'];

const AddInvoiceModal = ({ isOpen, onClose, onSave, existingCategories }: AddInvoiceModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<InvoiceFormData>({
    intake_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    document_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'חדש',
    supplier_name: '',
    document_number: '',
    document_type: 'חשבונית מס',
    category: '',
    amount_before_vat: 0,
    vat_amount: null,
    total_amount: 0,
    business_type: 'עוסק מורשה',
    entry_method: 'ידני',
    image_url: null,
  });

  const categories = [...new Set([...defaultCategories, ...existingCategories])];

  // Calculate VAT when amount or business type changes
  useEffect(() => {
    if (formData.amount_before_vat && formData.business_type) {
      if (formData.business_type === 'עוסק מורשה' || formData.business_type === 'חברה בע"מ') {
        const vat = Math.round(formData.amount_before_vat * 0.18 * 100) / 100;
        setFormData(prev => ({ ...prev, vat_amount: vat }));
      } else {
        setFormData(prev => ({ ...prev, vat_amount: null }));
      }
    }
  }, [formData.amount_before_vat, formData.business_type]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      toast.error('יש להעלות קובץ תמונה בלבד');
      return;
    }

    setIsAnalyzing(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('יש להתחבר כדי להעלות תמונות');
        return;
      }

      // Upload image to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;
      setUploadedImageUrl(imageUrl);

      // Call import-invoices to analyze the image
      const { data, error } = await supabase.functions.invoke('import-invoices', {
        body: { image_url: imageUrl }
      });

      if (error) {
        throw error;
      }

      // Update form with extracted data
      if (data?.invoice) {
        const inv = data.invoice;
        setFormData(prev => ({
          ...prev,
          supplier_name: inv.supplier_name || prev.supplier_name,
          document_number: inv.document_number || prev.document_number,
          document_type: inv.document_type || prev.document_type,
          document_date: inv.document_date || prev.document_date,
          total_amount: inv.total_amount || prev.total_amount,
          amount_before_vat: inv.amount_before_vat || prev.amount_before_vat,
          vat_amount: inv.vat_amount ?? prev.vat_amount,
          business_type: inv.business_type || prev.business_type,
          category: inv.category || prev.category,
          entry_method: 'דיגיטלי',
          image_url: imageUrl,
        }));
        toast.success('התמונה נותחה בהצלחה');
      } else {
        // Still save the image URL even if analysis failed
        setFormData(prev => ({
          ...prev,
          image_url: imageUrl,
          entry_method: 'דיגיטלי',
        }));
        toast.info('לא ניתן לנתח את התמונה, יש למלא את הפרטים ידנית');
      }
    } catch (error) {
      console.error('Error uploading/analyzing image:', error);
      toast.error('שגיאה בהעלאת או ניתוח התמונה');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!formData.supplier_name || !formData.document_number || !formData.category) {
      return;
    }
    onSave(formData);
    onClose();
    // Reset form
    setFormData({
      intake_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      document_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'חדש',
      supplier_name: '',
      document_number: '',
      document_type: 'חשבונית מס',
      category: '',
      amount_before_vat: 0,
      vat_amount: null,
      total_amount: 0,
      business_type: 'עוסק מורשה',
      entry_method: 'ידני',
      image_url: null,
    });
    setUploadedImageUrl(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">הוספת חשבונית חדשה</DialogTitle>
        </DialogHeader>

        {/* Image Upload Section */}
        <div className="mt-4 p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/50">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          
          {uploadedImageUrl ? (
            <div className="flex items-center gap-3">
              <img 
                src={uploadedImageUrl} 
                alt="תמונת חשבונית" 
                className="w-16 h-16 object-cover rounded border"
              />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">התמונה הועלתה בהצלחה</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                >
                  החלף תמונה
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="flex flex-col items-center justify-center py-4 cursor-pointer"
              onClick={() => !isAnalyzing && fileInputRef.current?.click()}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">מנתח את התמונה...</p>
                </>
              ) : (
                <>
                  <Image className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">העלה תמונת חשבונית</p>
                  <p className="text-xs text-muted-foreground">המערכת תנתח ותמלא את הפרטים אוטומטית</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
          <div className="space-y-2">
            <Label>תאריך ושעת קליטה</Label>
            <Input
              type="datetime-local"
              value={formData.intake_date}
              onChange={(e) => setFormData(prev => ({ ...prev, intake_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>סטטוס</Label>
            <Select
              value={formData.status}
              onValueChange={(value: InvoiceStatus) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>שם ספק *</Label>
            <Input
              value={formData.supplier_name}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
              placeholder="הזן שם ספק"
            />
          </div>

          <div className="space-y-2">
            <Label>סוג עוסק</Label>
            <Select
              value={formData.business_type}
              onValueChange={(value: BusinessType) => setFormData(prev => ({ ...prev, business_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {businessTypeOptions.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>קטגוריה *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר קטגוריה" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>תאריך מסמך</Label>
            <Input
              type="date"
              value={formData.document_date}
              onChange={(e) => setFormData(prev => ({ ...prev, document_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>סוג מסמך</Label>
            <Select
              value={formData.document_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, document_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentTypeOptions.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>מספר מסמך *</Label>
            <Input
              value={formData.document_number}
              onChange={(e) => setFormData(prev => ({ ...prev, document_number: e.target.value }))}
              placeholder="הזן מספר מסמך"
            />
          </div>

          <div className="space-y-2">
            <Label>לפני מע"מ</Label>
            <Input
              type="number"
              value={formData.amount_before_vat || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, amount_before_vat: Number(e.target.value) }))}
            />
          </div>

          <div className="space-y-2">
            <Label>מע"מ (18%)</Label>
            <Input
              type="number"
              value={formData.vat_amount || ''}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>סה"כ כולל מע"מ</Label>
            <Input
              type="number"
              value={formData.total_amount || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, total_amount: Number(e.target.value) }))}
            />
          </div>

          <div className="space-y-2">
            <Label>ידני / דיגיטלי</Label>
            <Select
              value={formData.entry_method}
              onValueChange={(value: EntryMethod) => setFormData(prev => ({ ...prev, entry_method: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {entryMethodOptions.map(method => (
                  <SelectItem key={method} value={method}>{method}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 ml-1" />
            ביטול
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.supplier_name || !formData.document_number || !formData.category}
          >
            <Plus className="h-4 w-4 ml-1" />
            הוסף חשבונית
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddInvoiceModal;
