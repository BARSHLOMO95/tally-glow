import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, Building2, FileText } from 'lucide-react';
import { BUSINESS_TYPES } from '@/types/settings';

export const BusinessInfoTab = () => {
  const { settings, updateSettings } = useSettings();

  const [companyName, setCompanyName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [defaultBusinessType, setDefaultBusinessType] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name || '');
      setBusinessNumber(settings.business_number || '');
      setDefaultBusinessType(settings.default_business_type || '');
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await updateSettings({
      company_name: companyName || null,
      business_number: businessNumber || null,
      default_business_type: defaultBusinessType || null,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            <CardTitle>פרטי העסק</CardTitle>
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
            <p className="text-xs text-muted-foreground">
              סוג העסק ברירת המחדל שיוצג בחשבוניות חדשות
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              שמור שינויים
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            <CardTitle>מידע נוסף</CardTitle>
          </div>
          <CardDescription>
            פרטי העסק שלך ישמשו ליצירת דוחות מפורטים יותר
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• שם העסק יופיע בדוחות החשבונאיים</p>
            <p>• מספר העסק (ח.פ. או עוסק מורשה) נדרש לאימות מס</p>
            <p>• סוג העסק משפיע על סוג הדוחות הזמינים</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
