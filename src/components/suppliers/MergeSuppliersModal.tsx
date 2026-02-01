import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Merge } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface MergeSuppliersModalProps {
  open: boolean;
  onClose: () => void;
  suppliers: string[];
}

export function MergeSuppliersModal({
  open,
  onClose,
  suppliers,
}: MergeSuppliersModalProps) {
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const queryClient = useQueryClient();

  const handleToggleSupplier = (supplier: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(supplier)
        ? prev.filter((s) => s !== supplier)
        : [...prev, supplier]
    );
  };

  const handleMerge = async () => {
    if (selectedSuppliers.length < 2) {
      toast.error('יש לבחור לפחות 2 ספקים למיזוג');
      return;
    }

    if (!newSupplierName.trim()) {
      toast.error('יש להזין שם לספק המאוחד');
      return;
    }

    setIsMerging(true);

    try {
      // Update all invoices from selected suppliers to new supplier name
      const { error } = await supabase
        .from('invoices')
        .update({ supplier_name: newSupplierName.trim() })
        .in('supplier_name', selectedSuppliers);

      if (error) {
        throw error;
      }

      toast.success(
        `${selectedSuppliers.length} ספקים מוזגו בהצלחה ל-"${newSupplierName}"`
      );

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      // Reset and close
      setSelectedSuppliers([]);
      setNewSupplierName('');
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('Error merging suppliers:', error);
      toast.error('שגיאה במיזוג ספקים');
    } finally {
      setIsMerging(false);
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClose = () => {
    if (!isMerging) {
      setSelectedSuppliers([]);
      setNewSupplierName('');
      setSearchQuery('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5 text-primary" />
            מיזוג ספקים
          </DialogTitle>
          <DialogDescription>
            בחר ספקים למיזוג והגדר שם חדש לספק המאוחד
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {/* Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              כל החשבוניות מהספקים שנבחרו יעודכנו לשם הספק החדש.
              <br />
              פעולה זו אינה ניתנת לביטול.
            </AlertDescription>
          </Alert>

          {/* New Supplier Name Input */}
          <div className="space-y-2">
            <Label htmlFor="newSupplierName">שם הספק המאוחד</Label>
            <Input
              id="newSupplierName"
              placeholder="הזן שם לספק המאוחד..."
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
              disabled={isMerging}
            />
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">חיפוש ספקים</Label>
            <Input
              id="search"
              placeholder="חפש ספק..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isMerging}
            />
          </div>

          {/* Selected Suppliers Count */}
          {selectedSuppliers.length > 0 && (
            <div className="text-sm text-muted-foreground">
              נבחרו {selectedSuppliers.length} ספקים למיזוג
            </div>
          )}

          {/* Suppliers List */}
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            <div className="divide-y">
              {filteredSuppliers.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  לא נמצאו ספקים
                </div>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <div
                    key={supplier}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`supplier-${supplier}`}
                      checked={selectedSuppliers.includes(supplier)}
                      onCheckedChange={() => handleToggleSupplier(supplier)}
                      disabled={isMerging}
                    />
                    <label
                      htmlFor={`supplier-${supplier}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      {supplier}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isMerging}
          >
            ביטול
          </Button>
          <Button
            onClick={handleMerge}
            disabled={
              isMerging ||
              selectedSuppliers.length < 2 ||
              !newSupplierName.trim()
            }
          >
            {isMerging ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ממזג...
              </>
            ) : (
              <>
                <Merge className="h-4 w-4 ml-2" />
                מזג ספקים ({selectedSuppliers.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
