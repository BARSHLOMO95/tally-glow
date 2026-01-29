import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useInvoices } from '@/hooks/useInvoices';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserRole } from '@/hooks/useUserRole';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import KPICards from '@/components/invoice/KPICards';
import FilterPanel from '@/components/invoice/FilterPanel';
import InvoiceTable from '@/components/invoice/InvoiceTable';
import InvoiceGrid from '@/components/invoice/InvoiceGrid';
import EditInvoiceModal from '@/components/invoice/EditInvoiceModal';
import BulkEditModal, { BulkEditData } from '@/components/invoice/BulkEditModal';
import ImageModal from '@/components/invoice/ImageModal';
import SupplierCardModal from '@/components/invoice/SupplierCardModal';
import AddInvoiceModal from '@/components/invoice/AddInvoiceModal';
import ImportExcelModal from '@/components/invoice/ImportExcelModal';
import DashboardCharts from '@/components/invoice/DashboardCharts';
import DuplicatesModal from '@/components/invoice/DuplicatesModal';
import { Invoice, InvoiceFormData, DuplicatesFilterMode } from '@/types/invoice';
import { LogOut, Plus, Loader2, Upload, RefreshCw, LayoutGrid, LayoutList, Settings, Crown, Sparkles, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type ViewMode = 'list' | 'grid';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { subscription, plan, usage, getRemainingDocuments } = useSubscription();
  const { settings } = useSettings();
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
    bulkUpdateInvoices,
    deleteInvoices,
    toggleSelection,
    toggleSelectAll,
    clearFilters,
  } = useInvoices(user?.id);

  // Merge categories from settings with existing invoice categories
  const allCategories = useMemo(() => {
    const settingsCategories = settings?.custom_categories || [];
    const invoiceCategories = filterOptions.categories;
    // Combine and deduplicate, prioritizing settings order
    const combined = [...settingsCategories];
    invoiceCategories.forEach(cat => {
      if (!combined.includes(cat)) {
        combined.push(cat);
      }
    });
    return combined;
  }, [settings?.custom_categories, filterOptions.categories]);

  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [imageModalData, setImageModalData] = useState<{ url: string; previewUrl?: string | null } | null>(null);
  const [supplierCardName, setSupplierCardName] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicatesMode, setDuplicatesMode] = useState<DuplicatesFilterMode>('all');
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

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
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatDate(inv.document_date)}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${inv.supplier_name}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${inv.document_number}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${inv.category}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${inv.vat_amount ? formatCurrency(inv.vat_amount) : '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(inv.total_amount)}</td>
      </tr>
    `).join('');
    
    const imagesSection = selectedInvoices
      .filter(inv => inv.image_url || inv.preview_image_url)
      .map(inv => {
        // Prioritize preview_image_url for PDFs, then image_url
        const displayUrl = inv.preview_image_url || inv.image_url;
        return `
          <div style="page-break-inside: avoid; margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; text-align: center;">
            <div style="font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 10px; text-align: right;">
              ${inv.supplier_name} - ${inv.document_number}
            </div>
            <img src="${displayUrl}" style="max-width: 80%; max-height: 700px; display: inline-block;" 
              crossorigin="anonymous"
              onerror="this.onerror=null; this.removeAttribute('crossorigin'); this.src='${displayUrl}';" />
          </div>
        `;
      }).join('');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <title>דוח הוצאות</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
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
    
    const printWindow = window.open('about:blank', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  const handleInvoiceAdded = () => {
    // Refresh the page to reload invoices
    window.location.reload();
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
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-40 w-full">
        <div className="w-full px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between flex-row-reverse">
            <div className="text-right">
              <h1 className="text-lg sm:text-xl font-bold">ניהול הוצאות</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">דאשבורד פיננסי בזמן אמת</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-row-reverse">
              {/* View Toggle */}
              <div className="flex items-center border rounded-lg p-0.5 bg-muted/50">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="px-2 h-7"
                  title="תצוגת רשימה"
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="px-2 h-7"
                  title="תצוגת כרטיסים"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
              
              <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="flex-row-reverse px-2 sm:px-3">
                <Plus className="h-4 w-4 sm:ml-2" />
                <span className="hidden sm:inline">הוסף חשבונית</span>
              </Button>
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)} size="sm" className="flex-row-reverse px-2 sm:px-3">
                <Upload className="h-4 w-4 sm:ml-2" />
                <span className="hidden sm:inline">ייבוא Excel</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="flex-row-reverse px-2 sm:px-3">
                <RefreshCw className="h-4 w-4 sm:ml-2" />
                <span className="hidden sm:inline">רענן</span>
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="text-primary" title="ממשק מנהל">
                  <Shield className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} className="text-muted-foreground" title="הגדרות">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground flex-row-reverse px-2 sm:px-3">
                <LogOut className="h-4 w-4 sm:ml-2" />
                <span className="hidden sm:inline">{user?.email?.split('@')[0]}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-3 sm:px-6 py-3 sm:py-6 space-y-3 sm:space-y-6">
        {/* Subscription Banner */}
        {subscription?.status !== 'active' && (
          <Card className="bg-gradient-to-l from-primary/10 via-purple-500/10 to-pink-500/10 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-full">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="font-medium">תוכנית חינמית</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{usage?.document_count || 0} / {plan?.document_limit || 10} מסמכים החודש</span>
                      <Progress 
                        value={((usage?.document_count || 0) / (plan?.document_limit || 10)) * 100} 
                        className="w-20 h-2"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                    {getRemainingDocuments()} מסמכים נותרו
                  </Badge>
                  <Button onClick={() => navigate('/pricing')} size="sm" className="gap-2">
                    <Crown className="h-4 w-4" />
                    שדרג עכשיו
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <KPICards 
          data={kpiData} 
          documentCount={invoices.length}
          filteredCount={displayedInvoices.length}
        />

        {/* Charts Section - Collapsible like filters */}
        <DashboardCharts invoices={displayedInvoices} />

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
            } else if (selectedIds.length > 1) {
              setIsBulkEditModalOpen(true);
            }
          }}
          onBulkDelete={handleBulkDelete}
          onPrint={handlePrint}
          onClearFilters={handleClearAll}
          onToggleDuplicates={handleToggleDuplicates}
          onOpenDuplicatesModal={() => setIsDuplicatesModalOpen(true)}
        />

        {/* Invoice View - Table or Grid */}
        {viewMode === 'list' ? (
          <InvoiceTable
            invoices={displayedInvoices}
            selectedIds={selectedIds}
            duplicateIds={duplicatesInfo.ids}
            onToggleSelection={toggleSelection}
            onToggleSelectAll={toggleSelectAll}
            onRowClick={(invoice) => setEditingInvoice(invoice)}
            onSupplierClick={(name) => setSupplierCardName(name)}
            onImageClick={(url, previewUrl) => setImageModalData({ url, previewUrl })}
          />
        ) : (
          <InvoiceGrid
            invoices={displayedInvoices}
            selectedIds={selectedIds}
            duplicateIds={duplicatesInfo.ids}
            onToggleSelection={toggleSelection}
            onRowClick={(invoice) => setEditingInvoice(invoice)}
            onSupplierClick={(name) => setSupplierCardName(name)}
            onImageClick={(url, previewUrl) => setImageModalData({ url, previewUrl })}
          />
        )}
      </main>

      {/* Modals */}
      <EditInvoiceModal
        invoice={editingInvoice}
        isOpen={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        onSave={updateInvoice}
        categories={allCategories}
      />

      <ImageModal
        imageUrl={imageModalData?.url || null}
        previewImageUrl={imageModalData?.previewUrl}
        isOpen={!!imageModalData}
        onClose={() => setImageModalData(null)}
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
        onSave={handleInvoiceAdded}
        existingCategories={allCategories}
      />

      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={bulkCreateInvoices}
      />

      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        onSave={(data: BulkEditData) => bulkUpdateInvoices(selectedIds, data)}
        selectedCount={selectedIds.length}
        categories={allCategories}
      />

      <DuplicatesModal
        isOpen={isDuplicatesModalOpen}
        onClose={() => setIsDuplicatesModalOpen(false)}
        invoices={invoices}
        onDeleteSelected={deleteInvoices}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
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