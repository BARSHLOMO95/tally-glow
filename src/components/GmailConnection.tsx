import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Loader2, RefreshCw, Unlink, CheckCircle, AlertCircle, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type TimeRange = 'week' | 'month' | '3months' | 'year';

interface GmailConnectionData {
  id: string;
  email: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'week', label: 'שבוע אחורה' },
  { value: 'month', label: 'חודש אחורה' },
  { value: '3months', label: '3 חודשים אחורה' },
  { value: 'year', label: 'שנה אחורה' },
];

export function GmailConnection() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<GmailConnectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showImportOptions, setShowImportOptions] = useState(false);

  const fetchConnection = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('gmail_connections')
      .select('id, email, is_active, last_sync_at, created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setConnection(data);
      // Show import options if connected but never synced
      if (data.is_active && !data.last_sync_at) {
        setShowImportOptions(true);
      }
    } else {
      setConnection(null);
    }
    setLoading(false);
  }, [user]);

  const handleSync = useCallback(async (syncTimeRange: TimeRange) => {
    setSyncing(true);
    setShowImportOptions(false);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('gmail-sync', {
        body: { timeRange: syncTimeRange },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { processed, invoicesCreated, totalFound } = response.data;
      
      if (invoicesCreated > 0) {
        toast.success(`נמצאו ${totalFound} מיילים, נוצרו ${invoicesCreated} חשבוניות חדשות`);
      } else {
        toast.info(`נסרקו ${processed} מיילים, לא נמצאו חשבוניות חדשות`);
      }
      
      await fetchConnection();
    } catch (error) {
      console.error('Gmail sync error:', error);
      toast.error('שגיאה בסנכרון Gmail');
    } finally {
      setSyncing(false);
    }
  }, [fetchConnection]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state) {
        setConnecting(true);
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          const redirectUrl = `${window.location.origin}/settings`;
          
          const response = await supabase.functions.invoke('gmail-auth', {
            body: { code, redirectUrl },
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
          });

          if (response.error) {
            throw new Error(response.error.message || 'Failed to connect Gmail');
          }

          if (response.data?.success) {
            toast.success(`Gmail מחובר בהצלחה: ${response.data.email}`);
            // Show import options after successful connection
            setShowImportOptions(true);
            await fetchConnection();
          }
        } catch (error) {
          console.error('Gmail callback error:', error);
          toast.error('שגיאה בחיבור Gmail');
        } finally {
          setConnecting(false);
          // Clean URL
          window.history.replaceState({}, '', '/settings');
        }
      }
    };

    handleCallback();
  }, [fetchConnection]);

  const handleConnect = async () => {
    if (!user) {
      toast.error('יש להתחבר למערכת תחילה');
      return;
    }
    
    setConnecting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const redirectUrl = `${window.location.origin}/settings`;
      
      const response = await supabase.functions.invoke('gmail-auth', {
        body: { redirectUrl },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.authUrl) {
        window.location.href = response.data.authUrl;
      }
    } catch (error) {
      console.error('Gmail connect error:', error);
      toast.error('שגיאה בהתחלת תהליך החיבור');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('gmail-auth', {
        body: {},
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setConnection(null);
      setShowImportOptions(false);
      toast.success('Gmail נותק בהצלחה');
    } catch (error) {
      console.error('Gmail disconnect error:', error);
      toast.error('שגיאה בניתוק Gmail');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Import options view - shown after connection or when never synced
  if (showImportOptions && connection?.is_active) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">ייבוא חשבוניות מ-Gmail</CardTitle>
          </div>
          <CardDescription>
            החשבון {connection.email} מחובר. בחר כמה זמן אחורה לסרוק:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {TIME_RANGE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                onClick={() => handleSync(option.value)}
                disabled={syncing}
                className="h-auto py-4 flex flex-col items-center gap-1"
              >
                {syncing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Calendar className="h-5 w-5 text-primary" />
                )}
                <span className="font-medium">{option.label}</span>
              </Button>
            ))}
          </div>
          
          <div className="flex items-start gap-2 p-3 bg-accent/50 rounded-lg border border-accent">
            <AlertCircle className="h-5 w-5 text-accent-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-accent-foreground">
              ככל שטווח הזמן גדול יותר, כך ייסרקו יותר מיילים ויותר חשבוניות ייובאו.
              וודא שיש לך מספיק מכסה בתוכנית שלך.
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={() => setShowImportOptions(false)}
            className="w-full text-muted-foreground"
          >
            דלג - אייבא מאוחר יותר
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-destructive" />
          <CardTitle className="text-lg">חיבור Gmail</CardTitle>
          {connection?.is_active && (
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
              <CheckCircle className="h-3 w-3 ml-1" />
              מחובר
            </Badge>
          )}
        </div>
        <CardDescription>
          ייבוא אוטומטי של חשבוניות מהמייל שלך (מצורפים, קבצי PDF ולינקים)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection?.is_active ? (
          <>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">חשבון מחובר:</span>
                <span className="font-medium">{connection.email}</span>
              </div>
              {connection.last_sync_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">סנכרון אחרון:</span>
                  <span className="text-sm flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(connection.last_sync_at).toLocaleString('he-IL')}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-sm text-muted-foreground">סנכרון אוטומטי:</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  <RefreshCw className="h-3 w-3 ml-1" />
                  פעיל - כל יום ב-8:00
                </Badge>
              </div>
            </div>
            
            <Button
              onClick={() => setShowImportOptions(true)}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              סנכרון חשבוניות
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleDisconnect}
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Unlink className="h-4 w-4 ml-2" />
              נתק Gmail
            </Button>
          </>
        ) : (
          <>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                חבר את חשבון הגמייל שלך כדי לייבא חשבוניות אוטומטית:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>קבצים מצורפים (PDF, תמונות)</li>
                <li>לינקים לחשבוניות בתוכן המייל</li>
                <li>זיהוי אוטומטי של מיילים עם מילות מפתח (חשבונית, קבלה...)</li>
              </ul>
            </div>
            
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full"
              size="lg"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 ml-2" />
              )}
              חבר חשבון Gmail
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}