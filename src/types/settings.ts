export interface UserSettings {
  id: string;
  user_id: string;
  whatsapp_number: string | null;
  whatsapp_group_id: string | null;
  custom_categories: string[];
  company_name: string | null;
  business_number: string | null;
  default_business_type: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_CATEGORIES = [
  'הנהלה וכללי',
  'שיווק ופרסום',
  'הוצאות משרד',
  'נסיעות ורכב',
  'ייעוץ מקצועי',
  'ציוד ומחשוב',
  'אחר'
];

export const BUSINESS_TYPES = [
  'עוסק מורשה',
  'עוסק פטור',
  'חברה בע"מ',
  'ספק חו"ל'
];
