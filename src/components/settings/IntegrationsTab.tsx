import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Loader2, MessageSquare, Mail, Link as LinkIcon } from 'lucide-react';
import { GmailConnection } from '@/components/GmailConnection';
import { UploadLinksManager } from '@/components/UploadLinksManager';

export const IntegrationsTab = () => {
  const { settings, updateSettings } = useSettings();

  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappGroupId, setWhatsappGroupId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setWhatsappNumber(settings.whatsapp_number || '');
      setWhatsappGroupId(settings.whatsapp_group_id || '');
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await updateSettings({
      whatsapp_number: whatsappNumber || null,
      whatsapp_group_id: whatsappGroupId || null,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-red-500" />
            <CardTitle>חיבור Gmail</CardTitle>
          </div>
          <CardDescription>
            חבר את חשבון Gmail שלך לייבוא אוטומטי של חשבוניות
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GmailConnection />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-orange-500" />
            <CardTitle>קישורי העלאה</CardTitle>
          </div>
          <CardDescription>
            צור קישורים ציבוריים להעלאת מסמכים
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadLinksManager />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            <CardTitle>הגדרות WhatsApp מתקדמות</CardTitle>
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
