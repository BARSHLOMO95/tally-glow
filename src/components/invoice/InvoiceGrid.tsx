import { Invoice } from '@/types/invoice';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, FileText, Image, Edit, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface InvoiceGridProps {
  invoices: Invoice[];
  selectedIds: string[];
  duplicateIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onRowClick: (invoice: Invoice) => void;
  onSupplierClick: (name: string) => void;
  onImageClick: (url: string, previewUrl?: string | null, additionalImages?: string[] | null) => void;
}

const statusColors: Record<string, string> = {
  'חדש': 'bg-blue-100 text-blue-700 border-blue-200',
  'בתהליך': 'bg-amber-100 text-amber-700 border-amber-200',
  'טופל': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const businessTypeColors: Record<string, string> = {
  'עוסק מורשה': 'bg-purple-100 text-purple-700',
  'עוסק פטור': 'bg-gray-100 text-gray-700',
  'חברה בע"מ': 'bg-indigo-100 text-indigo-700',
  'ספק חו"ל': 'bg-rose-100 text-rose-700',
};

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);

const InvoiceGrid = ({
  invoices,
  selectedIds,
  duplicateIds,
  onToggleSelection,
  onRowClick,
  onSupplierClick,
  onImageClick,
}: InvoiceGridProps) => {
  if (invoices.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-12 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">לא נמצאו חשבוניות</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Record count */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {invoices.length} רשומות
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {invoices.map((invoice) => {
          const isSelected = selectedIds.includes(invoice.id);
          const isDuplicate = duplicateIds.has(invoice.id);

          return (
            <Card
              key={invoice.id}
              className={`group relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
              } ${isDuplicate ? 'ring-2 ring-amber-400' : ''}`}
            >
              {/* Selection checkbox */}
              <div
                className="absolute top-3 right-3 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelection(invoice.id)}
                  className="bg-background"
                />
              </div>

              {/* Options menu */}
              <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur-sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    <DropdownMenuItem onClick={() => onRowClick(invoice)} className="flex-row-reverse">
                      <Edit className="h-4 w-4 ml-2" />
                      עריכה
                    </DropdownMenuItem>
                    {invoice.image_url && (
                      <DropdownMenuItem onClick={() => onImageClick(invoice.image_url!, invoice.preview_image_url, invoice.additional_images)} className="flex-row-reverse">
                        <Eye className="h-4 w-4 ml-2" />
                        צפייה בתמונה
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onSupplierClick(invoice.supplier_name)} className="flex-row-reverse">
                      <FileText className="h-4 w-4 ml-2" />
                      כרטיס ספק
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CardContent className="p-0" onClick={() => onRowClick(invoice)}>
                {/* Preview area - Image or Icon */}
                <div className="relative h-32 bg-muted/50 rounded-t-lg flex items-center justify-center overflow-hidden">
                  {/* Prioritize preview_image_url for PDFs, then image_url */}
                  {(invoice.preview_image_url || invoice.image_url) ? (
                    <img
                      src={invoice.preview_image_url || invoice.image_url || ''}
                      alt={invoice.document_number}
                      className="w-full h-full object-cover"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageClick(invoice.image_url!, invoice.preview_image_url, invoice.additional_images);
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <FileText className="h-12 w-12 mb-1" />
                      <span className="text-xs">{invoice.document_type || 'מסמך'}</span>
                    </div>
                  )}
                  
                  {/* Status badge overlay */}
                  <Badge
                    className={`absolute bottom-2 right-2 ${statusColors[invoice.status] || 'bg-gray-100 text-gray-700'}`}
                  >
                    {invoice.status}
                  </Badge>

                  {/* Duplicate indicator */}
                  {isDuplicate && (
                    <Badge className="absolute bottom-2 left-2 bg-amber-100 text-amber-700 border-amber-300">
                      כפילות
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="p-3 space-y-2">
                  {/* Supplier name - clickable */}
                  <h3
                    className="font-semibold text-sm truncate hover:text-primary cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSupplierClick(invoice.supplier_name);
                    }}
                    title={invoice.supplier_name}
                  >
                    {invoice.supplier_name}
                  </h3>

                  {/* Document number */}
                  <p className="text-xs text-muted-foreground truncate" title={invoice.document_number}>
                    אסמכתא: {invoice.document_number}
                  </p>

                  {/* Amount */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">
                      {formatCurrency(invoice.total_amount)}
                    </span>
                    <Badge variant="outline" className={`text-xs ${businessTypeColors[invoice.business_type] || ''}`}>
                      {invoice.business_type}
                    </Badge>
                  </div>

                  {/* Category */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {invoice.category}
                    </Badge>
                  </div>

                  {/* Footer - Dates */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>📅 {format(new Date(invoice.document_date), 'dd/MM/yy')}</span>
                    <span>🔥 {format(new Date(invoice.intake_date), 'dd/MM/yy')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default InvoiceGrid;
