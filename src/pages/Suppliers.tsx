import { useState, useMemo } from 'react';
import { Building2, TrendingUp, TrendingDown, FileText, Download, Search, Merge, ArrowUpDown, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInvoices } from '@/hooks/useInvoices';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupplierDetailsModal } from '@/components/suppliers/SupplierDetailsModal';
import { MergeSuppliersModal } from '@/components/suppliers/MergeSuppliersModal';
import * as XLSX from 'xlsx';

interface SupplierStats {
  name: string;
  invoiceCount: number;
  totalAmount: number;
  totalBeforeVat: number;
  totalVat: number;
  averageAmount: number;
  lastInvoiceDate: string | null;
  categories: string[];
}

export default function Suppliers() {
  const { user } = useAuth();
  const { invoices, loading } = useInvoices(user?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'invoices'>('name');
  const [suggestedMerges, setSuggestedMerges] = useState<string[]>([]);

  // Calculate supplier statistics
  const supplierStats = useMemo(() => {
    if (!invoices) return [];

    const statsMap = new Map<string, SupplierStats>();

    invoices.forEach((invoice) => {
      const supplierName = invoice.supplier_name || 'ספק לא ידוע';

      if (!statsMap.has(supplierName)) {
        statsMap.set(supplierName, {
          name: supplierName,
          invoiceCount: 0,
          totalAmount: 0,
          totalBeforeVat: 0,
          totalVat: 0,
          averageAmount: 0,
          lastInvoiceDate: null,
          categories: [],
        });
      }

      const stats = statsMap.get(supplierName)!;
      stats.invoiceCount++;
      stats.totalAmount += invoice.total_amount || 0;
      stats.totalBeforeVat += invoice.amount_before_vat || 0;
      stats.totalVat += invoice.vat_amount || 0;

      // Track last invoice date
      if (invoice.document_date) {
        if (!stats.lastInvoiceDate || invoice.document_date > stats.lastInvoiceDate) {
          stats.lastInvoiceDate = invoice.document_date;
        }
      }

      // Track categories
      if (invoice.category && !stats.categories.includes(invoice.category)) {
        stats.categories.push(invoice.category);
      }
    });

    // Calculate averages
    statsMap.forEach((stats) => {
      stats.averageAmount = stats.totalAmount / stats.invoiceCount;
    });

    return Array.from(statsMap.values());
  }, [invoices]);

  // Detect similar suppliers (smart merge suggestions)
  const similarSuppliers = useMemo(() => {
    const similar: Array<{ suppliers: string[]; reason: string }> = [];
    const names = supplierStats.map((s) => s.name);

    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const name1 = names[i].toLowerCase().trim();
        const name2 = names[j].toLowerCase().trim();

        // Check if one contains the other
        if (name1.includes(name2) || name2.includes(name1)) {
          similar.push({
            suppliers: [names[i], names[j]],
            reason: 'שמות דומים',
          });
        }
        // Check if they share significant words
        else {
          const words1 = name1.split(/\s+/).filter((w) => w.length > 2);
          const words2 = name2.split(/\s+/).filter((w) => w.length > 2);
          const commonWords = words1.filter((w) => words2.includes(w));

          if (commonWords.length > 0 && commonWords.length >= Math.min(words1.length, words2.length) * 0.5) {
            similar.push({
              suppliers: [names[i], names[j]],
              reason: 'מילים משותפות',
            });
          }
        }
      }
    }

    return similar;
  }, [supplierStats]);

  // Sort suppliers
  const sortedSuppliers = useMemo(() => {
    const sorted = [...supplierStats];

    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      case 'amount':
        return sorted.sort((a, b) => b.totalAmount - a.totalAmount);
      case 'invoices':
        return sorted.sort((a, b) => b.invoiceCount - a.invoiceCount);
      default:
        return sorted;
    }
  }, [supplierStats, sortBy]);

  // Filter suppliers based on search
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return sortedSuppliers;

    const query = searchQuery.toLowerCase();
    return sortedSuppliers.filter(
      (supplier) =>
        supplier.name.toLowerCase().includes(query) ||
        supplier.categories.some((cat) => cat.toLowerCase().includes(query))
    );
  }, [sortedSuppliers, searchQuery]);

  // Export to Excel
  const handleExport = () => {
    const exportData = filteredSuppliers.map((supplier) => ({
      'שם ספק': supplier.name,
      'מספר חשבוניות': supplier.invoiceCount,
      'סכום כולל': supplier.totalAmount.toFixed(2),
      'סכום לפני מעמ': supplier.totalBeforeVat.toFixed(2),
      'מעמ': supplier.totalVat.toFixed(2),
      'ממוצע לחשבונית': supplier.averageAmount.toFixed(2),
      'חשבונית אחרונה': supplier.lastInvoiceDate || 'לא ידוע',
      'קטגוריות': supplier.categories.join(', '),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ספקים');
    XLSX.writeFile(wb, `suppliers_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא ידוע';
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const totalSuppliers = supplierStats.length;
  const totalInvoices = supplierStats.reduce((sum, s) => sum + s.invoiceCount, 0);
  const totalSpent = supplierStats.reduce((sum, s) => sum + s.totalAmount, 0);
  const avgPerSupplier = totalSpent / totalSuppliers;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            ניהול ספקים
          </h1>
          <p className="text-muted-foreground mt-1">
            מעקב וניתוח מלא של כל הספקים במערכת
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMergeModalOpen(true)}>
            <Merge className="h-4 w-4 ml-2" />
            מיזוג ספקים
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 ml-2" />
            ייצא לאקסל
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">סה"כ ספקים</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSuppliers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ספקים פעילים במערכת
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">סה"כ חשבוניות</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground mt-1">
              חשבוניות מכל הספקים
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">סה"כ הוצאות</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              סכום כולל מכל הספקים
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ממוצע לספק</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgPerSupplier)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ממוצע הוצאות לספק
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Smart Merge Suggestions */}
      {similarSuppliers.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>נמצאו {similarSuppliers.length} זוגות ספקים דומים שניתן למזג</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-2">
              {similarSuppliers.slice(0, 3).map((suggestion, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md">
                  <div className="flex-1 text-sm">
                    <span className="font-medium">{suggestion.suppliers[0]}</span>
                    {' • '}
                    <span className="font-medium">{suggestion.suppliers[1]}</span>
                    {' '}
                    <span className="text-muted-foreground">({suggestion.reason})</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSuggestedMerges(suggestion.suppliers);
                      setMergeModalOpen(true);
                    }}
                  >
                    <Merge className="h-3 w-3 ml-1" />
                    מזג
                  </Button>
                </div>
              ))}
              {similarSuppliers.length > 3 && (
                <p className="text-xs text-muted-foreground mt-2">
                  ועוד {similarSuppliers.length - 3} הצעות נוספות...
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="חפש לפי שם ספק או קטגוריה..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'name' | 'amount' | 'invoices')}>
          <SelectTrigger className="w-48">
            <ArrowUpDown className="h-4 w-4 ml-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">מיון לפי שם (א-ב-ג)</SelectItem>
            <SelectItem value="amount">מיון לפי סכום</SelectItem>
            <SelectItem value="invoices">מיון לפי מספר חשבוניות</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'cards')}>
          <TabsList>
            <TabsTrigger value="table">טבלה</TabsTrigger>
            <TabsTrigger value="cards">כרטיסיות</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Suppliers List */}
      {viewMode === 'table' ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם ספק</TableHead>
                <TableHead className="text-right">חשבוניות</TableHead>
                <TableHead className="text-right">סה"כ הוצאות</TableHead>
                <TableHead className="text-right">ממוצע</TableHead>
                <TableHead className="text-right">חשבונית אחרונה</TableHead>
                <TableHead className="text-right">קטגוריות</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    לא נמצאו ספקים
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <TableRow
                    key={supplier.name}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedSupplier(supplier.name)}
                  >
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{supplier.invoiceCount}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(supplier.totalAmount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(supplier.averageAmount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(supplier.lastInvoiceDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {supplier.categories.slice(0, 2).map((cat) => (
                          <Badge key={cat} variant="outline" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                        {supplier.categories.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{supplier.categories.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSupplier(supplier.name);
                        }}
                      >
                        פרטים
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSuppliers.map((supplier) => (
            <Card
              key={supplier.name}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedSupplier(supplier.name)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {supplier.name}
                </CardTitle>
                <CardDescription>
                  {supplier.invoiceCount} חשבוניות • {formatDate(supplier.lastInvoiceDate)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">סה"כ הוצאות:</span>
                  <span className="font-bold text-lg">{formatCurrency(supplier.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">ממוצע:</span>
                  <span className="text-sm">{formatCurrency(supplier.averageAmount)}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {supplier.categories.slice(0, 3).map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Supplier Details Modal */}
      {selectedSupplier && (
        <SupplierDetailsModal
          supplierName={selectedSupplier}
          open={!!selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
        />
      )}

      {/* Merge Suppliers Modal */}
      <MergeSuppliersModal
        open={mergeModalOpen}
        onClose={() => {
          setMergeModalOpen(false);
          setSuggestedMerges([]);
        }}
        suppliers={supplierStats.map((s) => s.name)}
        initialSuppliers={suggestedMerges}
      />
    </div>
  );
}
