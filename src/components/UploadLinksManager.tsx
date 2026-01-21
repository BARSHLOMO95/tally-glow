import { useState } from 'react';
import { useUploadLinks } from '@/hooks/useUploadLinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Link2, Plus, Copy, Trash2, Loader2, ExternalLink } from 'lucide-react';

export function UploadLinksManager() {
  const { links, loading, createLink, toggleLinkActive, deleteLink, getUploadUrl } = useUploadLinks();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkPassword, setNewLinkPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateLink = async () => {
    setIsCreating(true);
    const link = await createLink(newLinkName, newLinkPassword);
    setIsCreating(false);
    
    if (link) {
      setNewLinkName('');
      setNewLinkPassword('');
      setIsDialogOpen(false);
    }
  };

  const copyToClipboard = async (linkCode: string) => {
    const url = getUploadUrl(linkCode);
    await navigator.clipboard.writeText(url);
    toast.success('הלינק הועתק!');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            לינקים להעלאה
          </CardTitle>
          <CardDescription>צרו לינקים ייחודיים להעלאת חשבוניות</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 ml-2" />
              לינק חדש
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>יצירת לינק חדש</DialogTitle>
              <DialogDescription>
                צרו לינק ייחודי עם סיסמה להעלאת חשבוניות
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="link-name">שם הלינק (אופציונלי)</Label>
                <Input
                  id="link-name"
                  placeholder="לדוגמה: לקוח ראשי"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-password">סיסמה *</Label>
                <Input
                  id="link-password"
                  type="password"
                  placeholder="לפחות 4 תווים"
                  value={newLinkPassword}
                  onChange={(e) => setNewLinkPassword(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleCreateLink} disabled={isCreating || !newLinkPassword}>
                {isCreating && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                צור לינק
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>אין לינקים עדיין</p>
            <p className="text-sm">צרו לינק ראשון להעלאת חשבוניות</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                  <Switch
                    checked={link.is_active}
                    onCheckedChange={(checked) => toggleLinkActive(link.id, checked)}
                  />
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {link.name || 'לינק ללא שם'}
                      </span>
                      <Badge variant={link.is_active ? 'default' : 'secondary'}>
                        {link.is_active ? 'פעיל' : 'מושבת'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate font-mono" dir="ltr">
                      {getUploadUrl(link.link_code)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 mr-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(link.link_code)}
                    title="העתק לינק"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(getUploadUrl(link.link_code), '_blank')}
                    title="פתח בלשונית חדשה"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>מחיקת לינק</AlertDialogTitle>
                        <AlertDialogDescription>
                          האם אתה בטוח שברצונך למחוק את הלינק הזה? פעולה זו לא ניתנת לביטול.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteLink(link.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          מחק
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
