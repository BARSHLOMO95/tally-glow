import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Invoice } from '@/types/invoice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const Trash = () => {
  const { user } = useAuth();
  const [deletedInvoices, setDeletedInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPermanentDeleteOpen, setIsPermanentDeleteOpen] = useState(false);

  const fetchDeleted = async () => {
    if (!user?.id) return;
    setLoading(true);

    // Use RPC or direct query - the RLS policy for deleted items will apply
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error(error);
      toast.error('שגיאה בטעינת סל המיחזור');
    } else {
      setDeletedInvoices(data as Invoice[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDeleted();
  }, [user?.id]);

  const handleRestore = async (ids: string[]) => {
    const { error } = await supabase
      .from('invoices')
      .update({ deleted_at: null })
      .in('id', ids);

    if (error) {
      toast.error('שגיאה בשחזור החשבוניות');
    } else {
      setDeletedInvoices(prev => prev.filter(i => !ids.includes(i.id)));
      setSelectedIds([]);
      toast.success(`${ids.length} חשבוניות שוחזרו בהצלחה`);
    }
  };

  const handlePermanentDelete = async () => {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .in('id', selectedIds);

    if (error) {
      toast.error('שגיאה במחיקה לצמיתות');
    } else {
      setDeletedInvoices(prev => prev.filter(i => !selectedIds.includes(i.id)));
      setSelectedIds([]);
      toast.success('החשבוניות נמחקו לצמיתות');
    }
    setIsPermanentDeleteOpen(false);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === deletedInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(deletedInvoices.map(i => i.id));
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('he-IL');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Trash2 className="h-7 w-7 text-muted-foreground" />
            סל מיחזור
          </h1>
          <p className="text-muted-foreground mt-1">
            {deletedInvoices.length} מסמכים בסל המיחזור
          </p>
        </div>
      </div>

      {/* Actions Bar */}
      {selectedIds.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm font-medium">{selectedIds.length} פריטים נבחרו</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleRestore(selectedIds)} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                שחזר
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setIsPermanentDeleteOpen(true)} className="gap-2">
                <Trash2 className="h-4 w-4" />
                מחק לצמיתות
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {deletedInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trash2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">סל המיחזור ריק</h3>
            <p className="text-muted-foreground mt-1">מסמכים שנמחקו יופיעו כאן ויהיו ניתנים לשחזור</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedIds.length === deletedInvoices.length && deletedInvoices.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <CardTitle className="text-base">בחר הכל</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {deletedInvoices.map(inv => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.includes(inv.id)}
                    onCheckedChange={() => toggleSelection(inv.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{inv.supplier_name || 'ללא ספק'}</span>
                      <span className="text-xs text-muted-foreground">#{inv.document_number || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{formatDate(inv.document_date)}</span>
                      <span>{inv.category}</span>
                      <span className="text-destructive">
                        נמחק ב-{formatDate((inv as any).deleted_at)}
                      </span>
                    </div>
                  </div>
                  <div className="text-left font-medium whitespace-nowrap">
                    {formatCurrency(inv.total_amount)}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRestore([inv.id])}
                    title="שחזר"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permanent Delete Dialog */}
      <AlertDialog open={isPermanentDeleteOpen} onOpenChange={setIsPermanentDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              מחיקה לצמיתות
            </AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק {selectedIds.length} חשבוניות לצמיתות? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentDelete} className="bg-destructive hover:bg-destructive/90">
              מחק לצמיתות
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Trash;
