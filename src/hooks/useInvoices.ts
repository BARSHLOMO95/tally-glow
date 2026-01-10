import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Invoice, InvoiceFormData, FilterState, KPIData, InvoiceStatus, BusinessType } from '@/types/invoice';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function useInvoices(userId: string | undefined) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    intakeMonths: [],
    documentMonths: [],
    intakeYears: [],
    documentYears: [],
    statuses: [],
    suppliers: [],
    categories: [],
    businessTypes: [],
    amountMin: null,
    amountMax: null,
  });

  // Fetch invoices
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchInvoices = async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('intake_date', { ascending: false });

      if (error) {
        toast.error('שגיאה בטעינת החשבוניות');
        console.error(error);
      } else {
        setInvoices(data as Invoice[]);
      }
      setLoading(false);
    };

    fetchInvoices();
  }, [userId]);

  // Calculate VAT based on business type
  const calculateVat = (amountBeforeVat: number, businessType: BusinessType): number | null => {
    if (businessType === 'עוסק מורשה' || businessType === 'חברה בע"מ') {
      return Math.round(amountBeforeVat * 0.18 * 100) / 100;
    }
    return null;
  };

  // Sort months chronologically descending (newest first)
  const sortMonthsChronologically = (months: string[]): string[] => {
    return months.sort((a, b) => {
      const [monthA, yearA] = a.split('/').map(Number);
      const [monthB, yearB] = b.split('/').map(Number);
      // Compare by year first, then by month (descending)
      if (yearA !== yearB) return yearB - yearA;
      return monthB - monthA;
    });
  };

  // Get unique values for filters - months are dependent on selected years
  const filterOptions = useMemo(() => {
    // Get all unique months
    const allIntakeMonths = [...new Set(invoices.map(i => format(new Date(i.intake_date), 'MM/yy')))];
    const allDocumentMonths = [...new Set(invoices.map(i => format(new Date(i.document_date), 'MM/yy')))];
    
    // Get unique years sorted descending (newest first)
    const intakeYears = [...new Set(invoices.map(i => format(new Date(i.intake_date), 'yyyy')))].sort((a, b) => Number(b) - Number(a));
    const documentYears = [...new Set(invoices.map(i => format(new Date(i.document_date), 'yyyy')))].sort((a, b) => Number(b) - Number(a));
    
    // Filter months based on selected years (dependent filtering)
    const filteredIntakeMonths = filters.intakeYears.length > 0
      ? allIntakeMonths.filter(month => {
          const yearShort = month.split('/')[1]; // "yy" format
          return filters.intakeYears.some(year => year.endsWith(yearShort));
        })
      : allIntakeMonths;
    
    const filteredDocumentMonths = filters.documentYears.length > 0
      ? allDocumentMonths.filter(month => {
          const yearShort = month.split('/')[1]; // "yy" format
          return filters.documentYears.some(year => year.endsWith(yearShort));
        })
      : allDocumentMonths;
    
    const suppliers = [...new Set(invoices.map(i => i.supplier_name))].sort();
    const categories = [...new Set(invoices.map(i => i.category))].sort();
    
    return {
      intakeMonths: sortMonthsChronologically(filteredIntakeMonths),
      documentMonths: sortMonthsChronologically(filteredDocumentMonths),
      intakeYears,
      documentYears,
      statuses: ['חדש', 'בתהליך', 'טופל'] as InvoiceStatus[],
      suppliers,
      categories,
      businessTypes: ['עוסק מורשה', 'עוסק פטור', 'חברה בע"מ', 'ספק חו"ל'] as BusinessType[],
    };
  }, [invoices, filters.intakeYears, filters.documentYears]);

  // Clear months that are no longer valid when year filter changes
  useEffect(() => {
    if (filters.intakeYears.length > 0) {
      const validMonths = filters.intakeMonths.filter(month => {
        const yearShort = month.split('/')[1];
        return filters.intakeYears.some(year => year.endsWith(yearShort));
      });
      if (validMonths.length !== filters.intakeMonths.length) {
        setFilters(prev => ({ ...prev, intakeMonths: validMonths }));
      }
    }
  }, [filters.intakeYears]);

  useEffect(() => {
    if (filters.documentYears.length > 0) {
      const validMonths = filters.documentMonths.filter(month => {
        const yearShort = month.split('/')[1];
        return filters.documentYears.some(year => year.endsWith(yearShort));
      });
      if (validMonths.length !== filters.documentMonths.length) {
        setFilters(prev => ({ ...prev, documentMonths: validMonths }));
      }
    }
  }, [filters.documentYears]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const intakeMonth = format(new Date(invoice.intake_date), 'MM/yy');
      const documentMonth = format(new Date(invoice.document_date), 'MM/yy');
      const intakeYear = format(new Date(invoice.intake_date), 'yyyy');
      const documentYear = format(new Date(invoice.document_date), 'yyyy');

      if (filters.intakeMonths.length > 0 && !filters.intakeMonths.includes(intakeMonth)) return false;
      if (filters.documentMonths.length > 0 && !filters.documentMonths.includes(documentMonth)) return false;
      if (filters.intakeYears.length > 0 && !filters.intakeYears.includes(intakeYear)) return false;
      if (filters.documentYears.length > 0 && !filters.documentYears.includes(documentYear)) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(invoice.status)) return false;
      if (filters.suppliers.length > 0 && !filters.suppliers.includes(invoice.supplier_name)) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(invoice.category)) return false;
      if (filters.businessTypes.length > 0 && !filters.businessTypes.includes(invoice.business_type)) return false;
      
      // Amount filters
      if (filters.amountMin !== null && invoice.total_amount < filters.amountMin) return false;
      if (filters.amountMax !== null && invoice.total_amount > filters.amountMax) return false;

      return true;
    });
  }, [invoices, filters]);

  // Calculate KPIs
  const kpiData = useMemo((): KPIData => {
    const totalWithVat = filteredInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0);
    const totalBeforeVat = filteredInvoices.reduce((sum, i) => sum + Number(i.amount_before_vat), 0);
    const totalVat = filteredInvoices.reduce((sum, i) => sum + (i.vat_amount ? Number(i.vat_amount) : 0), 0);
    const uniqueSuppliers = new Set(filteredInvoices.map(i => i.supplier_name)).size;

    return { totalWithVat, totalBeforeVat, totalVat, uniqueSuppliers };
  }, [filteredInvoices]);

  // Create invoice
  const createInvoice = async (data: InvoiceFormData) => {
    if (!userId) return;

    const vatAmount = calculateVat(data.amount_before_vat, data.business_type);
    
    const { data: newInvoice, error } = await supabase
      .from('invoices')
      .insert({
        ...data,
        user_id: userId,
        vat_amount: vatAmount,
      })
      .select()
      .single();

    if (error) {
      toast.error('שגיאה ביצירת החשבונית');
      console.error(error);
    } else {
      setInvoices(prev => [newInvoice as Invoice, ...prev]);
      toast.success('החשבונית נוצרה בהצלחה');
    }
  };

  // Bulk create invoices (for Excel import)
  const bulkCreateInvoices = async (dataList: InvoiceFormData[]) => {
    if (!userId) return;

    const invoicesToInsert = dataList.map(data => ({
      ...data,
      user_id: userId,
      vat_amount: calculateVat(data.amount_before_vat, data.business_type),
    }));

    const { data: newInvoices, error } = await supabase
      .from('invoices')
      .insert(invoicesToInsert)
      .select();

    if (error) {
      toast.error('שגיאה בייבוא החשבוניות');
      console.error(error);
    } else {
      setInvoices(prev => [...(newInvoices as Invoice[]), ...prev]);
      toast.success(`${newInvoices?.length || 0} חשבוניות יובאו בהצלחה`);
    }
  };

  // Update invoice
  const updateInvoice = async (id: string, data: Partial<InvoiceFormData>) => {
    const vatAmount = data.amount_before_vat && data.business_type 
      ? calculateVat(data.amount_before_vat, data.business_type)
      : undefined;

    const updateData = vatAmount !== undefined 
      ? { ...data, vat_amount: vatAmount }
      : data;

    const { data: updatedInvoice, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('שגיאה בעדכון החשבונית');
      console.error(error);
    } else {
      setInvoices(prev => prev.map(i => i.id === id ? updatedInvoice as Invoice : i));
      toast.success('החשבונית עודכנה בהצלחה');
    }
  };

  // Bulk update invoices
  const bulkUpdateInvoices = async (ids: string[], data: Partial<InvoiceFormData>) => {
    const { data: updatedInvoices, error } = await supabase
      .from('invoices')
      .update(data)
      .in('id', ids)
      .select();

    if (error) {
      toast.error('שגיאה בעדכון החשבוניות');
      console.error(error);
    } else {
      setInvoices(prev => prev.map(i => {
        const updated = updatedInvoices?.find(u => u.id === i.id);
        return updated ? (updated as Invoice) : i;
      }));
      setSelectedIds([]);
      toast.success(`${ids.length} חשבוניות עודכנו בהצלחה`);
    }
  };

  // Delete invoices
  const deleteInvoices = async (ids: string[]) => {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .in('id', ids);

    if (error) {
      toast.error('שגיאה במחיקת החשבוניות');
      console.error(error);
    } else {
      setInvoices(prev => prev.filter(i => !ids.includes(i.id)));
      setSelectedIds([]);
      toast.success(`${ids.length} חשבוניות נמחקו בהצלחה`);
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map(i => i.id));
    }
  };

  const clearFilters = () => {
    setFilters({
      intakeMonths: [],
      documentMonths: [],
      intakeYears: [],
      documentYears: [],
      statuses: [],
      suppliers: [],
      categories: [],
      businessTypes: [],
      amountMin: null,
      amountMax: null,
    });
  };

  return {
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
  };
}
