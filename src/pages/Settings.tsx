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
import { ArrowRight, Settings as SettingsIcon, MessageSquare, Building2, Tags, Plus, X, Save, Loader2 } from 'lucide-react';
import { BUSINESS_TYPES } from '@/types/settings';

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading, updateSettings, addCategory, removeCategory } = useSettings();
  
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappGroupId, setWhatsappGroupId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [defaultBusinessType, setDefaultBusinessType] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (settings) {
      setWhatsappNumber(settings.whatsapp_number || '');
      setWhatsappGroupId(settings.whatsapp_group_id || '');
      setCompanyName(settings.company_name || '');
      setBusinessNumber(settings.business_number || '');
      setDefaultBusinessType(settings.default_business_type || '');
    }
  }, [settings]);

  const handleSaveGeneral = async () => {
    setSaving(true);
    await updateSettings({
      whatsapp_number: whatsappNumber || null,
      whatsapp_group_id: whatsappGroupId || null,
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
        {/* WhatsApp Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">הגדרות WhatsApp</CardTitle>
            </div>
            <CardDescription>
              הגדר את מספר הטלפון וקבוצת WhatsApp לשליחת התראות
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-number">מספר WhatsApp</Label>
                <Input
                  id="whatsapp-number"
                  placeholder="972501234567"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
                <p className="text-xs text-muted-foreground">
                  הכנס את המספר בפורמט בינלאומי ללא + או רווחים
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
