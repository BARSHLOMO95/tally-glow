import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Invoice, InvoiceStatus, BusinessType, EntryMethod } from '@/types/invoice';
import { format } from 'date-fns';
import { ArrowUpDown, ArrowUp, ArrowDown, FileImage } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoiceTableProps {
  invoices: Invoice[];
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onRowClick: (invoice: Invoice) => void;
  onSupplierClick: (supplierName: string) => void;
  onImageClick: (imageUrl: string) => void;
}

type SortField = 'intake_date' | 'document_date' | 'status' | 'supplier_name' | 'document_number' | 'document_type' | 'category' | 'amount_before_vat' | 'vat_amount' | 'total_amount' | 'business_type' | 'entry_method';
type SortDirection = 'asc' | 'desc';

const statusColors: Record<InvoiceStatus, string> = {
  'חדש': 'bg-yellow-400 text-yellow-900',
  'בתהליך': 'bg-blue-500 text-white',
  'טופל': 'bg-green-500 text-white',
};

const businessTypeColors: Record<BusinessType, string> = {
  'עוסק מורשה': 'bg-blue-100 text-blue-800 border-blue-300',
  'עוסק פטור': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'חברה בע"מ': 'bg-green-100 text-green-800 border-green-300',
  'ספק חו"ל': 'bg-purple-100 text-purple-800 border-purple-300',
};

const entryMethodColors: Record<EntryMethod, string> = {
  'ידני': 'bg-orange-100 text-orange-800 border-orange-300',
  'דיגיטלי': 'bg-teal-100 text-teal-800 border-teal-300',
};

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return '-';
  return `₪${amount.toLocaleString('he-IL')}`;
};

const InvoiceTable = ({
  invoices,
  selectedIds,
  onToggleSelection,
  onToggleSelectAll,
  onRowClick,
  onSupplierClick,
  onImageClick,
}: InvoiceTableProps) => {
  const [sortField, setSortField] = useState<SortField>('intake_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (aVal === null || aVal === undefined) aVal = '' as any;
    if (bVal === null || bVal === undefined) bVal = '' as any;

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal);
    const bStr = String(bVal);
    return sortDirection === 'asc' 
      ? aStr.localeCompare(bStr, 'he')
      : bStr.localeCompare(aStr, 'he');
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  const isAllSelected = invoices.length > 0 && selectedIds.length === invoices.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < invoices.length;

  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = isPartiallySelected;
                    }
                  }}
                  onCheckedChange={onToggleSelectAll}
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSort('intake_date')}
              >
                <div className="flex items-center gap-1">
                  תאריך קליטה
                  <SortIcon field="intake_date" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  סטטוס
                  <SortIcon field="status" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSort('supplier_name')}
              >
                <div className="flex items-center gap-1">
                  שם הספק
                  <SortIcon field="supplier_name" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSort('business_type')}
              >
                <div className="flex items-center gap-1">
                  סוג עוסק
                  <SortIcon field="business_type" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center gap-1">
                  קטגוריה
                  <SortIcon field="category" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSort('document_date')}
              >
                <div className="flex items-center gap-1">
                  תאריך מסמך
                  <SortIcon field="document_date" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSort('document_type')}
              >
                <div className="flex items-center gap-1">
                  סוג מסמך
                  <SortIcon field="document_type" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSort('document_number')}
              >
                <div className="flex items-center gap-1">
                  מספר מסמך
                  <SortIcon field="document_number" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted transition-colors text-left"
                onClick={() => handleSort('amount_before_vat')}
              >
                <div className="flex items-center gap-1">
                  לפני מע"מ
                  <SortIcon field="amount_before_vat" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted transition-colors text-left"
                onClick={() => handleSort('vat_amount')}
              >
                <div className="flex items-center gap-1">
                  מע"מ
                  <SortIcon field="vat_amount" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted transition-colors text-left"
                onClick={() => handleSort('total_amount')}
              >
                <div className="flex items-center gap-1">
                  סכום כולל מע"מ
                  <SortIcon field="total_amount" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSort('entry_method')}
              >
                <div className="flex items-center gap-1">
                  ידני / דיגיטלי
                  <SortIcon field="entry_method" />
                </div>
              </TableHead>
              <TableHead className="w-12 text-center">תמונה</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                  לא נמצאו חשבוניות
                </TableCell>
              </TableRow>
            ) : (
              sortedInvoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-muted/50',
                    selectedIds.includes(invoice.id) && 'bg-primary/5'
                  )}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('[data-checkbox]') ||
                      target.closest('[data-supplier]') ||
                      target.closest('[data-image]')
                    ) {
                      return;
                    }
                    onRowClick(invoice);
                  }}
                >
                  <TableCell data-checkbox onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(invoice.id)}
                      onCheckedChange={() => onToggleSelection(invoice.id)}
                    />
                  </TableCell>
                  <TableCell>{format(new Date(invoice.intake_date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Badge className={cn('font-medium', statusColors[invoice.status])}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      data-supplier
                      className="text-primary hover:underline cursor-pointer font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSupplierClick(invoice.supplier_name);
                      }}
                    >
                      {invoice.supplier_name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn('font-medium', businessTypeColors[invoice.business_type])}
                    >
                      {invoice.business_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{invoice.category}</Badge>
                  </TableCell>
                  <TableCell>{format(new Date(invoice.document_date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{invoice.document_type}</TableCell>
                  <TableCell className="font-mono">{invoice.document_number}</TableCell>
                  <TableCell className="text-left font-medium">
                    {formatCurrency(Number(invoice.amount_before_vat))}
                  </TableCell>
                  <TableCell className="text-left">
                    {invoice.vat_amount ? (
                      <span className="font-bold text-primary">
                        {formatCurrency(Number(invoice.vat_amount))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-left font-bold">
                    {formatCurrency(Number(invoice.total_amount))}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn('font-medium', entryMethodColors[invoice.entry_method])}
                    >
                      {invoice.entry_method}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {invoice.image_url ? (
                      <button
                        data-image
                        className="text-primary hover:text-primary/80 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onImageClick(invoice.image_url!);
                        }}
                      >
                        <FileImage className="h-4 w-4 mx-auto" />
                      </button>
                    ) : (
                      <FileImage className="h-4 w-4 text-muted-foreground mx-auto" />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default InvoiceTable;
