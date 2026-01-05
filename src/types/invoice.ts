export type InvoiceStatus = 'חדש' | 'בתהליך' | 'טופל';
export type BusinessType = 'עוסק מורשה' | 'עוסק פטור' | 'חברה בע"מ' | 'ספק חו"ל';

export interface Invoice {
  id: string;
  user_id: string;
  intake_date: string;
  document_date: string;
  status: InvoiceStatus;
  supplier_name: string;
  document_number: string;
  category: string;
  amount_before_vat: number;
  vat_amount: number | null;
  total_amount: number;
  business_type: BusinessType;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceFormData {
  intake_date: string;
  document_date: string;
  status: InvoiceStatus;
  supplier_name: string;
  document_number: string;
  category: string;
  amount_before_vat: number;
  vat_amount: number | null;
  total_amount: number;
  business_type: BusinessType;
  image_url: string | null;
}

export interface FilterState {
  intakeMonths: string[];
  documentMonths: string[];
  statuses: InvoiceStatus[];
  suppliers: string[];
  categories: string[];
  businessTypes: BusinessType[];
}

export interface KPIData {
  totalWithVat: number;
  totalBeforeVat: number;
  totalVat: number;
  uniqueSuppliers: number;
}
