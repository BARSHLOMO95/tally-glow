import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Invoice } from '@/types/invoice';
import { AlertTriangle, Check } from 'lucide-react';

interface DuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  onSelectDuplicates: (ids: string[]) => void;
}

interface DuplicateGroup {
  key: string;
  invoices: Invoice[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('he-IL');

const DuplicatesModal = ({ isOpen, onClose, invoices, onSelectDuplicates }: DuplicatesModalProps) => {
  // מציאת כפילויות על בסיס מספר מסמך וסכום (±2 ש"ח)
  const duplicateGroups = useMemo(() => {
    const groups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    invoices.forEach((inv, i) => {
      if (processed.has(inv.id)) return;

      const matches = invoices.filter((other, j) => {
        if (i === j || processed.has(other.id)) return false;
        
        // התאמה על בסיס מספר מסמך
        const sameDocNumber = inv.document_number === other.document_number && inv.document_number !== '';
        
        // התאמה על בסיס סכום (±2 ש"ח)
        const amountDiff = Math.abs(inv.total_amount - other.total_amount);
        const similarAmount = amountDiff <= 2;
        
        // צריך התאמה במספר מסמך וגם בסכום
        return sameDocNumber && similarAmount;
      });

      if (matches.length > 0) {
        const groupInvoices = [inv, ...matches];
        groupInvoices.forEach(i => processed.add(i.id));
        groups.push({
          key: `${inv.document_number}-${inv.total_amount.toFixed(0)}`,
          invoices: groupInvoices
        });
      }
    });

    return groups;
  }, [invoices]);

  const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.invoices.length, 0);

  const handleSelectAll = () => {
    // בחירת כל הכפילויות חוץ מהראשונה בכל קבוצה
    const duplicateIds = duplicateGroups.flatMap(group => 
      group.invoices.slice(1).map(inv => inv.id)
    );
    onSelectDuplicates(duplicateIds);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            סינון כפילויות ({duplicateGroups.length} קבוצות)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {duplicateGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Check className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium">לא נמצאו כפילויות</h3>
              <p className="text-muted-foreground mt-1">
                כל החשבוניות ייחודיות לפי מספר מסמך וסכום
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                נמצאו {totalDuplicates} חשבוניות בעלות מספר מסמך זהה וסכום דומה (±2 ש"ח)
              </p>

              {duplicateGroups.map((group, groupIndex) => (
                <div key={group.key} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-2 flex items-center justify-between">
                    <Badge variant="secondary">
                      {group.invoices.length} חשבוניות
                    </Badge>
                    <span className="font-medium text-sm">
                      קבוצה {groupIndex + 1}: מסמך {group.invoices[0].document_number}
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">תאריך</TableHead>
                        <TableHead className="text-right">ספק</TableHead>
                        <TableHead className="text-right">מספר מסמך</TableHead>
                        <TableHead className="text-right">סכום</TableHead>
                        <TableHead className="text-right">סטטוס</TableHead>
                        <TableHead className="text-right">תאריך קליטה</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.invoices.map((inv, idx) => (
                        <TableRow 
                          key={inv.id}
                          className={idx === 0 ? 'bg-green-50' : 'bg-red-50'}
                        >
                          <TableCell>{formatDate(inv.document_date)}</TableCell>
                          <TableCell>{inv.supplier_name}</TableCell>
                          <TableCell>{inv.document_number}</TableCell>
                          <TableCell>{formatCurrency(inv.total_amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{inv.status}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(inv.intake_date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-200 rounded" /> מקור
                    </span>
                    <span className="inline-flex items-center gap-1 mr-4">
                      <div className="w-3 h-3 bg-red-200 rounded" /> כפילות מוצעת למחיקה
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {duplicateGroups.length > 0 && (
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSelectAll} className="flex-1">
              בחר את כל הכפילויות ({duplicateGroups.reduce((sum, g) => sum + g.invoices.length - 1, 0)})
            </Button>
            <Button variant="outline" onClick={onClose}>
              סגור
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DuplicatesModal;
