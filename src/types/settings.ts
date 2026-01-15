export interface UserSettings {
  id: string;
  user_id: string;
  whatsapp_number: string | null;
  whatsapp_group_id: string | null;
  phone_number: string | null;
  custom_categories: string[];
  company_name: string | null;
  business_number: string | null;
  default_business_type: string | null;
  created_at: string;
  updated_at: string;
}

// Validate E.164 phone format (e.g., 972501234567)
export const isValidPhoneNumber = (phone: string): boolean => {
  // E.164 format without + sign: country code + number, 7-15 digits
  const e164Pattern = /^[1-9]\d{6,14}$/;
  return e164Pattern.test(phone.replace(/[\s\-\(\)]/g, ''));
};

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
