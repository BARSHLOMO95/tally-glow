import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Loader2, RefreshCw, Unlink, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface GmailConnectionData {
  id: string;
  email: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export function GmailConnection() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<GmailConnectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const shouldSyncAfterConnect = useRef(false);

  const fetchConnection = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('gmail_connections')
      .select('id, email, is_active, last_sync_at, created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setConnection(data);
    } else {
      setConnection(null);
    }
    setLoading(false);
  }, [user]);

  const handleSync = useCallback(async (fullSync: boolean = false) => {
    setSyncing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('gmail-sync', {
        body: { fullSync },
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

  // Handle initial sync after connection
  useEffect(() => {
    if (shouldSyncAfterConnect.current && connection?.is_active) {
      shouldSyncAfterConnect.current = false;
      handleSync(true);
    }
  }, [connection, handleSync]);

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
            shouldSyncAfterConnect.current = true;
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
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => handleSync(false)}
                disabled={syncing}
                className="flex-1"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 ml-2" />
                )}
                סנכרון חשבוניות חדשות
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSync(true)}
                disabled={syncing}
              >
                סנכרון שנה אחורה
              </Button>
            </div>
            
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
            
            <div className="flex items-start gap-2 p-3 bg-accent/50 rounded-lg border border-accent">
              <AlertCircle className="h-5 w-5 text-accent-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-accent-foreground">
                <strong>הערה:</strong> בהתחברות הראשונה יסונכרנו חשבוניות משנה אחרונה.
                וודא שיש לך מספיק מכסה בתוכנית שלך.
              </div>
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
