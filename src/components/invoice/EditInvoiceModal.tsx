import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Invoice, InvoiceFormData, InvoiceStatus, BusinessType } from '@/types/invoice';
import { Save, X } from 'lucide-react';

interface EditInvoiceModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<InvoiceFormData>) => void;
  categories: string[];
}

const statusOptions: InvoiceStatus[] = ['חדש', 'בתהליך', 'טופל'];
const businessTypeOptions: BusinessType[] = ['עוסק מורשה', 'עוסק פטור', 'חברה בע"מ', 'ספק חו"ל'];

const EditInvoiceModal = ({ invoice, isOpen, onClose, onSave, categories }: EditInvoiceModalProps) => {
  const [formData, setFormData] = useState<Partial<InvoiceFormData>>({});

  useEffect(() => {
    if (invoice) {
      setFormData({
        intake_date: invoice.intake_date,
        document_date: invoice.document_date,
        status: invoice.status,
        supplier_name: invoice.supplier_name,
        document_number: invoice.document_number,
        category: invoice.category,
        amount_before_vat: Number(invoice.amount_before_vat),
        vat_amount: invoice.vat_amount ? Number(invoice.vat_amount) : null,
        total_amount: Number(invoice.total_amount),
        business_type: invoice.business_type,
        image_url: invoice.image_url,
      });
    }
  }, [invoice]);

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

  const handleSave = () => {
    if (invoice) {
      onSave(invoice.id, formData);
      onClose();
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">✏️ עריכת חשבונית</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Image placeholder */}
          <div className="md:col-span-2 bg-muted rounded-lg p-8 text-center">
            {invoice.image_url ? (
              <img 
                src={invoice.image_url} 
                alt="תמונת חשבונית" 
                className="max-h-48 mx-auto rounded-lg"
              />
            ) : (
              <div className="text-muted-foreground">
                <span className="text-4xl">📄</span>
                <p className="mt-2">אין תמונה</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>📅 תאריך קליטה</Label>
            <Input
              type="date"
              value={formData.intake_date || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, intake_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>📅 תאריך מסמך</Label>
            <Input
              type="date"
              value={formData.document_date || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, document_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>🟡 סטטוס</Label>
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
            <Label>🏢 שם ספק</Label>
            <Input
              value={formData.supplier_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>🔢 מספר מסמך</Label>
            <Input
              value={formData.document_number || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, document_number: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>📂 קטגוריה</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>🏷️ סוג עוסק</Label>
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
            <Label>💰 לפני מע"מ</Label>
            <Input
              type="number"
              value={formData.amount_before_vat || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, amount_before_vat: Number(e.target.value) }))}
            />
          </div>

          <div className="space-y-2">
            <Label>💸 מע"מ (18%)</Label>
            <Input
              type="number"
              value={formData.vat_amount || ''}
              readOnly
              className="bg-pink-50 text-pink-600 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label>💵 סה"כ</Label>
            <Input
              type="number"
              value={formData.total_amount || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, total_amount: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 ml-1" />
            ביטול
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 ml-1" />
            💾 שמור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditInvoiceModal;
