import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Link as LinkIcon } from 'lucide-react';
import { GmailConnection } from '@/components/GmailConnection';
import { UploadLinksManager } from '@/components/UploadLinksManager';

export const IntegrationsTab = () => {
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

    </div>
  );
};
