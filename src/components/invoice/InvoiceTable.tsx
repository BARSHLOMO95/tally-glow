import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Invoice, InvoiceStatus, BusinessType, EntryMethod } from '@/types/invoice';
import { format } from 'date-fns';
import { ArrowUpDown, ArrowUp, ArrowDown, FileImage, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

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

interface ColumnConfig {
  key: string;
  label: string;
  width: number;
  minWidth: number;
}

const defaultColumnWidths: Record<string, number> = {
  checkbox: 40,
  intake_date: 90,
  status: 70,
  supplier_name: 120,
  business_type: 90,
  category: 80,
  document_date: 90,
  document_type: 80,
  document_number: 80,
  amount_before_vat: 85,
  vat_amount: 70,
  total_amount: 90,
  entry_method: 70,
  image: 45,
};

const statusColors: Record<InvoiceStatus, string> = {
  'חדש': 'bg-yellow-400 text-yellow-900',
  'בתהליך': 'bg-blue-500 text-white',
  'טופל': 'bg-green-500 text-white',
};

const businessTypeColors: Record<BusinessType, string> = {
  'עוסק מורשה': 'bg-blue-100 text-blue-800',
  'עוסק פטור': 'bg-yellow-100 text-yellow-800',
  'חברה בע"מ': 'bg-green-100 text-green-800',
  'ספק חו"ל': 'bg-purple-100 text-purple-800',
};

const entryMethodColors: Record<EntryMethod, string> = {
  'ידני': 'bg-orange-100 text-orange-800',
  'דיגיטלי': 'bg-teal-100 text-teal-800',
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
  const [columnWidths, setColumnWidths] = useState(defaultColumnWidths);
  const [showColumnSettings, setShowColumnSettings] = useState(false);

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
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40 shrink-0" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 shrink-0" />
      : <ArrowDown className="h-3 w-3 shrink-0" />;
  };

  const isAllSelected = invoices.length > 0 && selectedIds.length === invoices.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < invoices.length;

  const updateColumnWidth = (key: string, value: number) => {
    setColumnWidths(prev => ({ ...prev, [key]: value }));
  };

  const columnSettings = [
    { key: 'supplier_name', label: 'שם ספק', min: 80, max: 200 },
    { key: 'category', label: 'קטגוריה', min: 60, max: 150 },
    { key: 'document_number', label: 'מספר מסמך', min: 60, max: 120 },
    { key: 'amount_before_vat', label: 'לפני מע"מ', min: 70, max: 120 },
    { key: 'total_amount', label: 'סה"כ', min: 70, max: 120 },
  ];

  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden" dir="rtl">
      {/* Column Settings */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-row-reverse">
        <span className="text-sm text-muted-foreground">
          {invoices.length} רשומות
        </span>
        <Popover open={showColumnSettings} onOpenChange={setShowColumnSettings}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="flex-row-reverse">
              <Settings2 className="h-4 w-4 ml-2" />
              רוחב עמודות
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 bg-popover" dir="rtl">
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-right">התאמת רוחב עמודות</h4>
              {columnSettings.map(col => (
                <div key={col.key} className="space-y-2">
                  <div className="flex justify-between text-sm flex-row-reverse">
                    <Label>{col.label}</Label>
                    <span className="text-muted-foreground">{columnWidths[col.key]}px</span>
                  </div>
                  <Slider
                    value={[columnWidths[col.key]]}
                    min={col.min}
                    max={col.max}
                    step={5}
                    onValueChange={([val]) => updateColumnWidth(col.key, val)}
                  />
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setColumnWidths(defaultColumnWidths)}
              >
                איפוס לברירת מחדל
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="overflow-x-auto">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead style={{ width: columnWidths.checkbox }} className="text-center p-2">
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
                style={{ width: columnWidths.intake_date }}
                className="cursor-pointer hover:bg-muted transition-colors p-2 whitespace-nowrap text-right"
                onClick={() => handleSort('intake_date')}
              >
                <div className="flex items-center gap-1 flex-row-reverse justify-start">
                  <SortIcon field="intake_date" />
                  <span>ת.קליטה</span>
                </div>
              </TableHead>
              <TableHead 
                style={{ width: columnWidths.status }}
                className="cursor-pointer hover:bg-muted transition-colors p-2 whitespace-nowrap text-right"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1 flex-row-reverse justify-start">
                  <SortIcon field="status" />
                  <span>סטטוס</span>
                </div>
              </TableHead>
              <TableHead 
                style={{ width: columnWidths.supplier_name }}
                className="cursor-pointer hover:bg-muted transition-colors p-2 whitespace-nowrap text-right"
                onClick={() => handleSort('supplier_name')}
              >
                <div className="flex items-center gap-1 flex-row-reverse justify-start">
                  <SortIcon field="supplier_name" />
                  <span>ספק</span>
                </div>
              </TableHead>
              <TableHead 
                style={{ width: columnWidths.business_type }}
                className="cursor-pointer hover:bg-muted transition-colors p-2 whitespace-nowrap text-right"
                onClick={() => handleSort('business_type')}
              >
                <div className="flex items-center gap-1 flex-row-reverse justify-start">
                  <SortIcon field="business_type" />
                  <span>סוג עוסק</span>
                </div>
              </TableHead>
              <TableHead 
                style={{ width: columnWidths.category }}
                className="cursor-pointer hover:bg-muted transition-colors p-2 whitespace-nowrap text-right"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center gap-1 flex-row-reverse justify-start">
                  <SortIcon field="category" />
                  <span>קטגוריה</span>
                </div>
              </TableHead>
              <TableHead 
                style={{ width: columnWidths.document_date }}
                className="cursor-pointer hover:bg-muted transition-colors p-2 whitespace-nowrap text-right"
                onClick={() => handleSort('document_date')}
              >
                <div className="flex items-center gap-1 flex-row-reverse justify-start">
                  <SortIcon field="document_date" />
                  <span>ת.מסמך</span>
                </div>
              </TableHead>
              <TableHead 
                style={{ width: columnWidths.document_type }}
                className="cursor-pointer hover:bg-muted transition-colors p-2 whitespace-nowrap text-right"
                onClick={() => handleSort('document_type')}
              >
                <div className="flex items-center gap-1 flex-row-reverse justify-start">
                  <SortIcon field="document_type" />
                  <span>סוג</span>
                </div>
              </TableHead>
              <TableHead 
                style={{ width: columnWidths.document_number }}
                className="cursor-pointer hover:bg-muted transition-colors p-2 whitespace-nowrap text-right"
                onClick={() => handleSort('document_number')}
              >
                <div className="flex items-center gap-1 flex-row-reverse justify-start">
                  <SortIcon field="document_number" />
                  <span>מס׳</span>
                </div>
              </TableHead>
              <TableHead 
                style={{ width: columnWidths.amount_before_vat }}
                className="cursor-pointer hover:bg-muted transition-colors p-2 whitespace-nowrap text-right"
                onClick={() => handleSort('amount_before_vat')}
              >
                <div className="flex items-center gap-1 flex-row-reverse justify-start">
                  <SortIcon field="amount_before_vat" />
                  <span>לפני מע"מ</span>
                </div>
              </TableHead>
              <TableHead 
                style={{ width: columnWidths.vat_amount }}
                className="cursor-pointer hover:bg-muted transition-colors p-2 whitespace-nowrap text-right"
                onClick={() => handleSort('vat_amount')}
              >
                <div className="flex items-center gap-1 flex-row-reverse justify-start">
                  <SortIcon field="vat_amount" />
                  <span>מע"מ</span>
                </div>
              </TableHead>
              <TableHead 
                style={{ width: columnWidths.total_amount }}
                className="cursor-pointer hover:bg-muted transition-colors p-2 whitespace-nowrap text-right"
                onClick={() => handleSort('total_amount')}
              >
                <div className="flex items-center gap-1 flex-row-reverse justify-start">
                  <SortIcon field="total_amount" />
                  <span>סה"כ</span>
                </div>
              </TableHead>
              <TableHead 
                style={{ width: columnWidths.entry_method }}
                className="cursor-pointer hover:bg-muted transition-colors p-2 whitespace-nowrap text-right"
                onClick={() => handleSort('entry_method')}
              >
                <div className="flex items-center gap-1 flex-row-reverse justify-start">
                  <SortIcon field="entry_method" />
                  <span>אופן</span>
                </div>
              </TableHead>
              <TableHead style={{ width: columnWidths.image }} className="text-center p-2">📷</TableHead>
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
                    selectedIds.includes(invoice.id) && 'bg-primary/10'
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
                  <TableCell data-checkbox className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(invoice.id)}
                      onCheckedChange={() => onToggleSelection(invoice.id)}
                    />
                  </TableCell>
                  <TableCell className="p-2 whitespace-nowrap text-xs text-right">
                    {format(new Date(invoice.intake_date), 'dd/MM/yy')}
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    <Badge className={cn('text-xs px-1.5 py-0', statusColors[invoice.status])}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    <span
                      data-supplier
                      className="text-primary hover:underline cursor-pointer font-medium text-xs truncate block text-right"
                      style={{ maxWidth: columnWidths.supplier_name }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSupplierClick(invoice.supplier_name);
                      }}
                      title={invoice.supplier_name}
                    >
                      {invoice.supplier_name}
                    </span>
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    <Badge 
                      variant="outline" 
                      className={cn('text-xs px-1.5 py-0 whitespace-nowrap', businessTypeColors[invoice.business_type])}
                    >
                      {invoice.business_type === 'עוסק מורשה' ? 'מורשה' : 
                       invoice.business_type === 'עוסק פטור' ? 'פטור' :
                       invoice.business_type === 'חברה בע"מ' ? 'חברה' : 'חו"ל'}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    <span className="text-xs truncate block text-right" style={{ maxWidth: columnWidths.category }} title={invoice.category}>
                      {invoice.category}
                    </span>
                  </TableCell>
                  <TableCell className="p-2 whitespace-nowrap text-xs text-right">
                    {format(new Date(invoice.document_date), 'dd/MM/yy')}
                  </TableCell>
                  <TableCell className="p-2 text-xs truncate text-right" title={invoice.document_type}>
                    {invoice.document_type.substring(0, 8)}
                  </TableCell>
                  <TableCell className="p-2 font-mono text-xs text-right">{invoice.document_number}</TableCell>
                  <TableCell className="p-2 text-right text-xs font-medium whitespace-nowrap">
                    {formatCurrency(Number(invoice.amount_before_vat))}
                  </TableCell>
                  <TableCell className="p-2 text-right text-xs whitespace-nowrap">
                    {invoice.vat_amount ? (
                      <span className="font-bold text-primary">
                        {formatCurrency(Number(invoice.vat_amount))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="p-2 text-right text-xs font-bold whitespace-nowrap">
                    {formatCurrency(Number(invoice.total_amount))}
                  </TableCell>
                  <TableCell className="p-2">
                    <Badge 
                      variant="outline" 
                      className={cn('text-xs px-1.5 py-0', entryMethodColors[invoice.entry_method])}
                    >
                      {invoice.entry_method === 'ידני' ? '✍️' : '💻'}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-2 text-center">
                    {invoice.image_url ? (
                      <button
                        data-image
                        className="text-primary hover:text-primary/80 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onImageClick(invoice.image_url!);
                        }}
                      >
                        <FileImage className="h-4 w-4" />
                      </button>
                    ) : (
                      <FileImage className="h-4 w-4 text-muted-foreground/40" />
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
