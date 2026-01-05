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
import { Invoice, InvoiceFormData } from '@/types/invoice';
import { LogOut, Plus, FileText, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
    window.print();
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const webhookUrl = `https://osqanpfiprsbcontotlq.supabase.co/functions/v1/import-invoices`;
                      navigator.clipboard.writeText(webhookUrl);
                      toast.success('כתובת Webhook הועתקה!', {
                        description: webhookUrl
                      });
                    }}
                  >
                    <Upload className="h-4 w-4 ml-1" />
                    ייבוא נתונים
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>לחץ להעתקת כתובת ה-Webhook</p>
                </TooltipContent>
              </Tooltip>
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
