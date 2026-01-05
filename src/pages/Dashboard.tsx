import { useState, useMemo } from 'react';
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
import DashboardCharts from '@/components/invoice/DashboardCharts';
import { Invoice, InvoiceFormData, DuplicatesFilterMode } from '@/types/invoice';
import { LogOut, Plus, Loader2, Upload, LayoutGrid, RefreshCw, Settings, Eye, EyeOff } from 'lucide-react';
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
  const [showCharts, setShowCharts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicatesMode, setDuplicatesMode] = useState<DuplicatesFilterMode>('all');

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Error signing out');
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
      toast.info('Select invoices to print');
      return;
    }
    
    const selectedInvoices = invoices.filter(inv => selectedIds.includes(inv.id));
    
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
    
    const formatDate = (dateString: string) => 
      new Date(dateString).toLocaleDateString('he-IL');
    
    const totalBeforeVat = selectedInvoices.reduce((sum, inv) => sum + inv.amount_before_vat, 0);
    const totalVat = selectedInvoices.reduce((sum, inv) => sum + (inv.vat_amount || 0), 0);
    const totalAmount = selectedInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    
    const tableRows = selectedInvoices.map(inv => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${formatDate(inv.document_date)}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${inv.supplier_name}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${inv.document_number}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${inv.category}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${inv.vat_amount ? formatCurrency(inv.vat_amount) : '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(inv.total_amount)}</td>
      </tr>
    `).join('');
    
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
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Expense Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f5f5f5; border: 1px solid #ddd; padding: 10px; }
          @media print {
            .no-print { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1 style="text-align: center; margin-bottom: 5px;">Expense Report</h1>
        <p style="text-align: center; color: #666; margin-bottom: 20px;">
          Generated: ${new Date().toLocaleDateString()}
        </p>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Supplier</th>
              <th>Reference</th>
              <th>Category</th>
              <th>VAT</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background: #e8f4fc;">
              <td colspan="4" style="border: 1px solid #ddd; padding: 10px;">Total</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${formatCurrency(totalVat)}</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${formatCurrency(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
        
        ${imagesSection ? `<h2 style="margin-top: 40px; border-bottom: 2px solid #333; padding-bottom: 10px;">Invoice Images</h2>${imagesSection}` : ''}
        
        <button class="no-print" onclick="window.print()" style="position: fixed; bottom: 20px; right: 20px; padding: 15px 30px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
          Print
        </button>
      </body>
      </html>
    `;
    
    const printWindow = window.open('about:blank', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  const handleCreateInvoice = (data: InvoiceFormData) => {
    createInvoice(data);
  };

  // Calculate duplicates
  const duplicatesInfo = useMemo(() => {
    const groups = new Map<string, string[]>();
    invoices.forEach((inv) => {
      const key = `${inv.document_number}-${Math.round(inv.total_amount)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(inv.id);
    });
    
    const duplicateIds = new Set<string>();
    groups.forEach((ids) => {
      if (ids.length > 1) {
        ids.forEach(id => duplicateIds.add(id));
      }
    });
    
    return {
      count: duplicateIds.size,
      ids: duplicateIds
    };
  }, [invoices]);

  // Toggle duplicates mode: all -> duplicates_only -> no_duplicates -> all
  const handleToggleDuplicates = () => {
    setDuplicatesMode(prev => {
      if (prev === 'all') return 'duplicates_only';
      if (prev === 'duplicates_only') return 'no_duplicates';
      return 'all';
    });
  };

  // Filter invoices by search query and duplicates mode
  const displayedInvoices = useMemo(() => {
    let result = filteredInvoices;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(inv =>
        inv.supplier_name.toLowerCase().includes(query) ||
        inv.document_number.toLowerCase().includes(query) ||
        inv.category.toLowerCase().includes(query)
      );
    }
    
    // Apply duplicates filter
    if (duplicatesMode === 'duplicates_only') {
      result = result.filter(inv => duplicatesInfo.ids.has(inv.id));
    } else if (duplicatesMode === 'no_duplicates') {
      result = result.filter(inv => !duplicatesInfo.ids.has(inv.id));
    }
    
    return result;
  }, [filteredInvoices, searchQuery, duplicatesMode, duplicatesInfo.ids]);

  const handleClearAll = () => {
    clearFilters();
    setSearchQuery('');
    setDuplicatesMode('all');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Expense Management</h1>
              <p className="text-sm text-muted-foreground hidden md:block">Real-time Financial Dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                ONLINE
              </span>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button 
                variant={showCharts ? "default" : "outline"} 
                size="sm" 
                onClick={() => setShowCharts(!showCharts)}
              >
                {showCharts ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {showCharts ? 'Hide Charts' : 'Show Charts'}
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <KPICards 
          data={kpiData} 
          documentCount={invoices.length}
          filteredCount={displayedInvoices.length}
        />

        {/* Charts Section - uses filtered invoices */}
        <DashboardCharts invoices={displayedInvoices} isVisible={showCharts} />

        {/* Filter Panel */}
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
          filterOptions={filterOptions}
          selectedCount={selectedIds.length}
          duplicatesCount={duplicatesInfo.count}
          duplicatesMode={duplicatesMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onBulkEdit={() => {
            if (selectedIds.length === 1) {
              const invoice = invoices.find(i => i.id === selectedIds[0]);
              if (invoice) setEditingInvoice(invoice);
            } else {
              toast.info('Select one invoice to edit');
            }
          }}
          onBulkDelete={handleBulkDelete}
          onPrint={handlePrint}
          onClearFilters={handleClearAll}
          onToggleDuplicates={handleToggleDuplicates}
        />

        {/* Invoice Table */}
        <InvoiceTable
          invoices={displayedInvoices}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} invoice(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        <Button onClick={() => setIsAddModalOpen(true)} size="lg" className="shadow-lg">
          <Plus className="h-5 w-5 mr-1" />
          Add Invoice
        </Button>
        <Button variant="outline" onClick={() => setIsImportModalOpen(true)} className="shadow-lg bg-card">
          <Upload className="h-4 w-4 mr-1" />
          Import Excel
        </Button>
      </div>

      {/* User Menu - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
          <LogOut className="h-4 w-4 mr-1" />
          {user?.email?.split('@')[0]}
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;