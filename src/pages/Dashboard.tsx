import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useInvoices } from '@/hooks/useInvoices';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import KPICards from '@/components/invoice/KPICards';
import FilterPanel from '@/components/invoice/FilterPanel';
import InvoiceTable from '@/components/invoice/InvoiceTable';
import EditInvoiceModal from '@/components/invoice/EditInvoiceModal';
import ImageModal from '@/components/invoice/ImageModal';
import SupplierCardModal from '@/components/invoice/SupplierCardModal';
import AddInvoiceModal from '@/components/invoice/AddInvoiceModal';
import ImportExcelModal from '@/components/invoice/ImportExcelModal';
import { Invoice, InvoiceFormData } from '@/types/invoice';
import { LogOut, Plus, FileText, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const {
    invoices,
    filteredInvoices,
    loading,
    selectedIds,
    filters,
    filterOptions,
    kpiData,
    setFilters,
    createInvoice,
    bulkCreateInvoices,
    updateInvoice,
    deleteInvoices,
    toggleSelection,
    toggleSelectAll,
    clearFilters,
  } = useInvoices(user?.id);

  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [supplierCardName, setSupplierCardName] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('שגיאה בהתנתקות');
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteInvoices(selectedIds);
    setIsDeleteDialogOpen(false);
  };

  const handlePrint = () => {
    if (selectedIds.length === 0) {
      toast.info('בחר חשבוניות להדפסה');
      return;
    }
    
    // Get selected invoices
    const selectedInvoices = invoices.filter(inv => selectedIds.includes(inv.id));
    
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
    
    const formatDate = (dateString: string) => 
      new Date(dateString).toLocaleDateString('he-IL');
    
    // Calculate totals
    const totalBeforeVat = selectedInvoices.reduce((sum, inv) => sum + inv.amount_before_vat, 0);
    const totalVat = selectedInvoices.reduce((sum, inv) => sum + (inv.vat_amount || 0), 0);
    const totalAmount = selectedInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    
    // Build table rows
    const tableRows = selectedInvoices.map(inv => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatDate(inv.document_date)}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${inv.supplier_name}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${inv.document_number}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${inv.category}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${inv.vat_amount ? formatCurrency(inv.vat_amount) : '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(inv.total_amount)}</td>
      </tr>
    `).join('');
    
    // Build images section
    const imagesSection = selectedInvoices
      .filter(inv => inv.image_url)
      .map(inv => `
        <div style="page-break-inside: avoid; margin-bottom: 30px; border: 1px solid #ddd; padding: 15px;">
          <div style="font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
            ${inv.supplier_name} - ${inv.document_number}
          </div>
          <img src="${inv.image_url}" style="max-width: 100%; max-height: 800px;" onerror="this.style.display='none'" />
        </div>
      `).join('');
    
    // Create the HTML document
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <title>דוח הוצאות</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f5f5f5; border: 1px solid #ddd; padding: 10px; text-align: right; }
          @media print {
            .no-print { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1 style="text-align: center; margin-bottom: 5px;">דוח הוצאות</h1>
        <p style="text-align: center; color: #666; margin-bottom: 20px;">
          תאריך הפקה: ${new Date().toLocaleDateString('he-IL')}
        </p>
        
        <table>
          <thead>
            <tr>
              <th>תאריך</th>
              <th>ספק</th>
              <th>אסמכתא</th>
              <th>קטגוריה</th>
              <th>מע"מ</th>
              <th>סה"כ</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background: #e8f4fc;">
              <td colspan="4" style="border: 1px solid #ddd; padding: 10px; text-align: left;">סה"כ</td>
              <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${formatCurrency(totalVat)}</td>
              <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${formatCurrency(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
        
        ${imagesSection ? `<h2 style="margin-top: 40px; border-bottom: 2px solid #333; padding-bottom: 10px;">תמונות חשבוניות</h2>${imagesSection}` : ''}
        
        <button class="no-print" onclick="window.print()" style="position: fixed; bottom: 20px; left: 20px; padding: 15px 30px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
          הדפס
        </button>
      </body>
      </html>
    `;
    
    // Open in new blank window and write content
    const printWindow = window.open('about:blank', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  const handleCreateInvoice = (data: InvoiceFormData) => {
    createInvoice(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">מערכת ניהול חשבוניות</h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 ml-1" />
                הוסף חשבונית
              </Button>
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <Upload className="h-4 w-4 ml-1" />
                ייבוא מ-Excel
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 ml-1" />
                התנתק
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <KPICards data={kpiData} />

        {/* Filter Panel */}
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
          filterOptions={filterOptions}
          selectedCount={selectedIds.length}
          onBulkEdit={() => {
            if (selectedIds.length === 1) {
              const invoice = invoices.find(i => i.id === selectedIds[0]);
              if (invoice) setEditingInvoice(invoice);
            } else {
              toast.info('בחר חשבונית אחת לעריכה');
            }
          }}
          onBulkDelete={handleBulkDelete}
          onPrint={handlePrint}
          onClearFilters={clearFilters}
        />

        {/* Invoice Table */}
        <InvoiceTable
          invoices={filteredInvoices}
          selectedIds={selectedIds}
          onToggleSelection={toggleSelection}
          onToggleSelectAll={toggleSelectAll}
          onRowClick={(invoice) => setEditingInvoice(invoice)}
          onSupplierClick={(name) => setSupplierCardName(name)}
          onImageClick={(url) => setImageModalUrl(url)}
        />
      </main>

      {/* Modals */}
      <EditInvoiceModal
        invoice={editingInvoice}
        isOpen={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        onSave={updateInvoice}
        categories={filterOptions.categories}
      />

      <ImageModal
        imageUrl={imageModalUrl}
        isOpen={!!imageModalUrl}
        onClose={() => setImageModalUrl(null)}
      />

      <SupplierCardModal
        supplierName={supplierCardName}
        invoices={invoices}
        isOpen={!!supplierCardName}
        onClose={() => setSupplierCardName(null)}
      />

      <AddInvoiceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleCreateInvoice}
        existingCategories={filterOptions.categories}
      />

      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={bulkCreateInvoices}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>אישור מחיקה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק {selectedIds.length} חשבוניות? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
