import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Phone, AlertCircle, User, Mail } from 'lucide-react';
import { isValidPhoneNumber } from '@/types/settings';
import { toast } from 'sonner';

export const PersonalInfoTab = () => {
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFirstName(settings.first_name || '');
      setLastName(settings.last_name || '');
      setPhoneNumber(settings.phone_number || '');
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

  const handleSave = async () => {
    if (!validatePhone(phoneNumber)) {
      toast.error('יש לתקן את מספר הטלפון לפני שמירה');
      return;
    }

    setSaving(true);
    await updateSettings({
      first_name: firstName || null,
      last_name: lastName || null,
      phone_number: phoneNumber,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>מידע כללי</CardTitle>
          </div>
          <CardDescription>
            הפרטים האישיים שלך במערכת
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">שם פרטי</Label>
              <Input
                id="first-name"
                placeholder="הכנס שם פרטי"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">שם משפחה</Label>
              <Input
                id="last-name"
                placeholder="הכנס שם משפחה"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">כתובת אימייל</Label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              כתובת האימייל לא ניתנת לשינוי
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={phoneError ? 'border-destructive' : ''}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <CardTitle>מספר טלפון</CardTitle>
            <Badge variant="destructive">חובה</Badge>
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
    </div>
  );
};
