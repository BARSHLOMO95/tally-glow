import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useInvoices } from '@/hooks/useInvoices';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Building2, FileText, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SupplierDetailsModalProps {
  supplierName: string;
  open: boolean;
  onClose: () => void;
}

export function SupplierDetailsModal({
  supplierName,
  open,
  onClose,
}: SupplierDetailsModalProps) {
  const { user } = useAuth();
  const { invoices: allInvoices } = useInvoices(user?.id);

  const supplierInvoices = useMemo(() => {
    if (!allInvoices) return [];
    return allInvoices
      .filter((inv) => inv.supplier_name === supplierName)
      .sort((a, b) => {
        const dateA = a.document_date || '';
        const dateB = b.document_date || '';
        return dateB.localeCompare(dateA);
      });
  }, [allInvoices, supplierName]);

  const stats = useMemo(() => {
    const total = supplierInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalBeforeVat = supplierInvoices.reduce(
      (sum, inv) => sum + (inv.amount_before_vat || 0),
      0
    );
    const totalVat = supplierInvoices.reduce((sum, inv) => sum + (inv.vat_amount || 0), 0);
    const average = total / supplierInvoices.length || 0;

    const categories = new Set(
      supplierInvoices.map((inv) => inv.category).filter(Boolean)
    );

    return {
      total,
      totalBeforeVat,
      totalVat,
      average,
      count: supplierInvoices.length,
      categories: Array.from(categories),
    };
  }, [supplierInvoices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Building2 className="h-6 w-6 text-primary" />
            {supplierName}
          </DialogTitle>
          <DialogDescription>
            פרטים מלאים וחשבוניות עבור הספק
          </DialogDescription>
        </DialogHeader>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                חשבוניות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.count}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                סה"כ הוצאות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                ממוצע
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.average)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                מע"מ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalVat)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Categories */}
        {stats.categories.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">קטגוריות:</h3>
            <div className="flex flex-wrap gap-2">
              {stats.categories.map((cat) => (
                <Badge key={cat} variant="secondary">
                  {cat}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Invoices Table */}
        <div>
          <h3 className="text-lg font-semibold mb-4">חשבוניות ({stats.count})</h3>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-right">מספר מסמך</TableHead>
                  <TableHead className="text-right">סוג</TableHead>
                  <TableHead className="text-right">קטגוריה</TableHead>
                  <TableHead className="text-right">סכום</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      לא נמצאו חשבוניות
                    </TableCell>
                  </TableRow>
                ) : (
                  supplierInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{formatDate(invoice.document_date)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {invoice.document_number || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{invoice.document_type || 'לא ידוע'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{invoice.category || '-'}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(invoice.total_amount || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            invoice.status === 'חדש'
                              ? 'default'
                              : invoice.status === 'טופל'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
