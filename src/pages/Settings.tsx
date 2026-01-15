import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Settings as SettingsIcon, MessageSquare, Building2, Tags, Plus, X, Save, Loader2, Phone, AlertCircle } from 'lucide-react';
import { BUSINESS_TYPES, isValidPhoneNumber } from '@/types/settings';
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading, updateSettings, addCategory, removeCategory } = useSettings();
  
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappGroupId, setWhatsappGroupId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [defaultBusinessType, setDefaultBusinessType] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (settings) {
      setWhatsappNumber(settings.whatsapp_number || '');
      setWhatsappGroupId(settings.whatsapp_group_id || '');
      setPhoneNumber(settings.phone_number || '');
      setCompanyName(settings.company_name || '');
      setBusinessNumber(settings.business_number || '');
      setDefaultBusinessType(settings.default_business_type || '');
    }
  }, [settings]);

  const validatePhone = (phone: string): boolean => {
    if (!phone.trim()) {
      setPhoneError('מספר טלפון הוא שדה חובה');
      return false;
    }
    if (!isValidPhoneNumber(phone)) {
      setPhoneError('מספר טלפון לא תקין. השתמש בפורמט בינלאומי (לדוגמה: 972501234567)');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleSaveGeneral = async () => {
    // Validate phone number before saving
    if (!validatePhone(phoneNumber)) {
      toast.error('יש לתקן את מספר הטלפון לפני שמירה');
      return;
    }
    
    setSaving(true);
    await updateSettings({
      whatsapp_number: whatsappNumber || null,
      whatsapp_group_id: whatsappGroupId || null,
      phone_number: phoneNumber,
      company_name: companyName || null,
      business_number: businessNumber || null,
      default_business_type: defaultBusinessType || null,
    });
    setSaving(false);
  };

  const handleAddCategory = async () => {
    if (newCategory.trim()) {
      await addCategory(newCategory);
      setNewCategory('');
    }
  };

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">הגדרות</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Phone Number - Required */}
        <Card className={phoneError ? 'border-destructive' : ''}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">מספר טלפון</CardTitle>
              <Badge variant="destructive" className="mr-2">חובה</Badge>
            </div>
            <CardDescription>
              מספר הטלפון שלך לקבלת התראות WhatsApp על מסמכים חדשים
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-number">מספר טלפון (פורמט E.164)</Label>
              <Input
                id="phone-number"
                placeholder="972501234567"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (phoneError) validatePhone(e.target.value);
                }}
                dir="ltr"
                className={`text-left ${phoneError ? 'border-destructive' : ''}`}
              />
              {phoneError ? (
                <div className="flex items-center gap-1 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{phoneError}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  הכנס את המספר בפורמט בינלאומי ללא + או רווחים (לדוגמה: 972501234567)
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">הגדרות WhatsApp מתקדמות</CardTitle>
            </div>
            <CardDescription>
              הגדרות Green API לשליחת התראות (אופציונלי)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-number">מזהה Instance (Green API)</Label>
                <Input
                  id="whatsapp-number"
                  placeholder="7103171806"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
                <p className="text-xs text-muted-foreground">
                  מזהה ה-Instance מ-Green API
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp-group">מזהה קבוצה (Group ID)</Label>
                <Input
                  id="whatsapp-group"
                  placeholder="120363123456789012@g.us"
                  value={whatsappGroupId}
                  onChange={(e) => setWhatsappGroupId(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
                <p className="text-xs text-muted-foreground">
                  מזהה הקבוצה מ-Green API
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">פרטי העסק</CardTitle>
            </div>
            <CardDescription>
              הגדר את פרטי העסק שלך לדוחות וחשבוניות
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-name">שם העסק</Label>
                <Input
                  id="company-name"
                  placeholder="שם החברה/העסק"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-number">ח.פ. / עוסק מורשה</Label>
                <Input
                  id="business-number"
                  placeholder="123456789"
                  value={businessNumber}
                  onChange={(e) => setBusinessNumber(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-business-type">סוג עסק ברירת מחדל</Label>
              <Select value={defaultBusinessType} onValueChange={setDefaultBusinessType}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="בחר סוג עסק" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Categories Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-lg">קטגוריות</CardTitle>
            </div>
            <CardDescription>
              נהל את הקטגוריות לסיווג חשבוניות והוצאות
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="הוסף קטגוריה חדשה..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <Button onClick={handleAddCategory} disabled={!newCategory.trim()}>
                <Plus className="h-4 w-4 ml-1" />
                הוסף
              </Button>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              {settings?.custom_categories.map((category) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="text-sm py-1.5 px-3 flex items-center gap-2"
                >
                  {category}
                  <button
                    onClick={() => removeCategory(category)}
                    className="hover:text-destructive transition-colors"
                    aria-label={`הסר ${category}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {settings?.custom_categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                אין קטגוריות. הוסף קטגוריה חדשה למעלה.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSaveGeneral} disabled={saving} size="lg">
            {saving ? (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 ml-2" />
            )}
            שמור הגדרות
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Settings;
