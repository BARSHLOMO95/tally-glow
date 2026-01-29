export type InvoiceStatus = 'חדש' | 'בתהליך' | 'טופל' | 'ממתין לבדיקה ידנית';
export type BusinessType = 'עוסק מורשה' | 'עוסק פטור' | 'חברה בע"מ' | 'ספק חו"ל';
export type EntryMethod = 'ידני' | 'דיגיטלי' | 'gmail_sync';
export type StorageStatus = 'success' | 'failed' | 'pending';
export type FileSource = 'gmail_attachment' | 'gmail_external_link' | 'whatsapp' | 'manual_upload' | 'public_link';

export interface Invoice {
  id: string;
  user_id: string;
  intake_date: string;
  document_date: string;
  status: InvoiceStatus;
  supplier_name: string;
  document_number: string;
  document_type: string;
  category: string;
  amount_before_vat: number;
  vat_amount: number | null;
  total_amount: number;
  business_type: BusinessType;
  entry_method: EntryMethod;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  // New file metadata fields
  file_name: string | null;
  mime_type: string | null;
  file_source: FileSource | null;
  storage_status: StorageStatus | null;
  original_url: string | null;
  storage_error: string | null;
}

export interface InvoiceFormData {
  intake_date: string;
  document_date: string;
  status: InvoiceStatus;
  supplier_name: string;
  document_number: string;
  document_type: string;
  category: string;
  amount_before_vat: number;
  vat_amount: number | null;
  total_amount: number;
  business_type: BusinessType;
  entry_method: EntryMethod;
  image_url: string | null;
}

export interface FilterState {
  intakeMonths: string[];
  documentMonths: string[];
  intakeYears: string[];
  documentYears: string[];
  statuses: InvoiceStatus[];
  suppliers: string[];
  categories: string[];
  businessTypes: BusinessType[];
  amountMin: number | null;
  amountMax: number | null;
}

export type DuplicatesFilterMode = 'all' | 'duplicates_only' | 'no_duplicates';

export interface KPIData {
  totalWithVat: number;
  totalBeforeVat: number;
  totalVat: number;
  uniqueSuppliers: number;
}
