import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Mail, Loader2, RefreshCw, Unlink, CheckCircle, AlertCircle, Clock, Calendar, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type TimeRange = 'week' | 'month' | '3months' | 'year';

interface GmailConnectionData {
  id: string;
  email: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  account_label: string;
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'week', label: 'שבוע אחורה' },
  { value: 'month', label: 'חודש אחורה' },
  { value: '3months', label: '3 חודשים אחורה' },
  { value: 'year', label: 'שנה אחורה' },
];

export function GmailConnection() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<GmailConnectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null); // Track which account is syncing
  const [connecting, setConnecting] = useState(false);
  const [showImportOptions, setShowImportOptions] = useState<string | null>(null); // Track which account to show import for
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');

  const fetchConnections = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('gmail_connections')
      .select('id, email, is_active, last_sync_at, created_at, account_label')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const connectionsWithLabels = data.map((conn, index) => ({
        ...conn,
        account_label: conn.account_label || `תיבת מייל ${index + 1}`,
      }));
      setConnections(connectionsWithLabels);
      // Show import options for newly connected account (no sync yet)
      const newConnection = data.find(c => c.is_active && !c.last_sync_at);
      if (newConnection) {
        setShowImportOptions(newConnection.id);
      }
    } else {
      setConnections([]);
    }
    setLoading(false);
  }, [user]);

  const handleSync = useCallback(async (connectionId: string, syncTimeRange: TimeRange) => {
    setSyncing(connectionId);
    setShowImportOptions(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('gmail-sync', {
        body: {
          timeRange: syncTimeRange,
          connectionId: connectionId
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        let errorMessage = response.error.message || 'שגיאה בסנכרון Gmail';
        try {
          const errorBody = await response.error.context?.json();
          if (errorBody?.error) {
            errorMessage = errorBody.error;
          }
        } catch {
          // context may not be a Response or may not have json
        }
        throw new Error(errorMessage);
      }

      const { processed, invoicesCreated, totalFound } = response.data;

      if (invoicesCreated > 0) {
        toast.success(`נמצאו ${totalFound} מיילים, נוצרו ${invoicesCreated} חשבוניות חדשות`);
      } else {
        toast.info(`נסרקו ${processed} מיילים, לא נמצאו חשבוניות חדשות`);
      }

      await fetchConnections();
    } catch (error) {
      console.error('Gmail sync error:', error);
      const message = error instanceof Error ? error.message : 'שגיאה בסנכרון Gmail';
      toast.error(message);
    } finally {
      setSyncing(null);
    }
  }, [fetchConnections]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Handle OAuth callback - use ref to prevent double execution on re-renders
  const callbackProcessedRef = useRef(false);
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      if (!code || !state) return;

      // Prevent double execution (effect can re-fire when fetchConnections changes)
      if (callbackProcessedRef.current) return;
      callbackProcessedRef.current = true;

      // Clean URL immediately to prevent re-processing
      window.history.replaceState({}, '', '/settings');

      // Retrieve the account label saved before the OAuth redirect
      const accountLabel = localStorage.getItem('gmail_pending_account_label') || 'תיבת מייל חדשה';
      localStorage.removeItem('gmail_pending_account_label');

      setConnecting(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('לא נמצא חיבור פעיל - יש להתחבר מחדש');
        }

        const redirectUrl = `${window.location.origin}/settings`;

        const response = await supabase.functions.invoke('gmail-auth', {
          body: { code, redirectUrl, accountLabel },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.error) {
          // In Supabase JS v2, FunctionsHttpError.context is a Response object
          let errorMessage = response.error.message || 'שגיאה בחיבור Gmail';
          try {
            const errorBody = await response.error.context?.json();
            if (errorBody?.error) {
              errorMessage = errorBody.error;
            }
          } catch {
            // context may not be a Response or may not have json
          }
          throw new Error(errorMessage);
        }

        if (response.data?.success) {
          toast.success(`Gmail מחובר בהצלחה: ${response.data.email}`);
          await fetchConnections();
          const newConnection = response.data.connectionId;
          if (newConnection) {
            setShowImportOptions(newConnection);
          }
        }
      } catch (error) {
        console.error('Gmail callback error:', error);
        const message = error instanceof Error ? error.message : 'שגיאה בחיבור Gmail';
        toast.error(message);
      } finally {
        setConnecting(false);
      }
    };

    handleCallback();
  }, [fetchConnections]);

  const handleConnect = async (accountLabel?: string) => {
    if (!user) {
      toast.error('יש להתחבר למערכת תחילה');
      return;
    }

    if (connections.length >= 3) {
      toast.error('ניתן לחבר עד 3 חשבונות Gmail בלבד');
      return;
    }

    setConnecting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const redirectUrl = `${window.location.origin}/settings`;

      // If no label provided, use default based on count
      const label = accountLabel || `תיבת מייל ${connections.length + 1}`;

      // Save the label to localStorage so it survives the OAuth redirect
      localStorage.setItem('gmail_pending_account_label', label);

      const response = await supabase.functions.invoke('gmail-auth', {
        body: { redirectUrl, accountLabel: label },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        localStorage.removeItem('gmail_pending_account_label');
        let errorMessage = response.error.message || 'שגיאה בחיבור Gmail';
        try {
          const errorBody = await response.error.context?.json();
          if (errorBody?.error) {
            errorMessage = errorBody.error;
          }
        } catch {
          // context may not be a Response or may not have json
        }
        throw new Error(errorMessage);
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

  const handleDisconnect = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('gmail_connections')
        .delete()
        .eq('id', connectionId);

      if (error) {
        throw error;
      }

      await fetchConnections();
      toast.success('Gmail נותק בהצלחה');
    } catch (error) {
      console.error('Gmail disconnect error:', error);
      toast.error('שגיאה בניתוק Gmail');
    }
  };

  const handleUpdateLabel = async (connectionId: string, newLabel: string) => {
    if (!newLabel.trim()) {
      toast.error('יש להזין שם לחשבון');
      return;
    }

    try {
      const { error } = await supabase
        .from('gmail_connections')
        .update({ account_label: newLabel.trim() })
        .eq('id', connectionId);

      if (error) {
        throw error;
      }

      setConnections(prev => prev.map(conn =>
        conn.id === connectionId
          ? { ...conn, account_label: newLabel.trim() }
          : conn
      ));
      setEditingLabel(null);
      toast.success('השם עודכן בהצלחה');
    } catch (error) {
      console.error('Error updating label:', error);
      toast.error('שגיאה בעדכון שם החשבון');
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
  const connectionToImport = connections.find(c => c.id === showImportOptions);
  if (showImportOptions && connectionToImport?.is_active) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">ייבוא חשבוניות מ-Gmail</CardTitle>
          </div>
          <CardDescription>
            החשבון {connectionToImport.email} ({connectionToImport.account_label}) מחובר. בחר כמה זמן אחורה לסרוק:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {TIME_RANGE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                onClick={() => handleSync(connectionToImport.id, option.value)}
                disabled={syncing === connectionToImport.id}
                className="h-auto py-4 flex flex-col items-center gap-1"
              >
                {syncing === connectionToImport.id ? (
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
            onClick={() => setShowImportOptions(null)}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">חיבור Gmail</CardTitle>
            {connections.length > 0 && (
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                {connections.length}/3 חשבונות
              </Badge>
            )}
          </div>
          {connections.length < 3 && (
            <Button
              onClick={() => handleConnect()}
              disabled={connecting}
              size="sm"
              variant="outline"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 ml-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 ml-1" />
              )}
              הוסף חשבון
            </Button>
          )}
        </div>
        <CardDescription>
          ייבוא אוטומטי של חשבוניות מהמייל שלך (מצורפים, קבצי PDF ולינקים)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connections.length > 0 ? (
          <>
            {connections.map((connection) => (
              <div key={connection.id} className="bg-muted/50 rounded-lg p-4 space-y-3 border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    {editingLabel === connection.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={labelInput}
                          onChange={(e) => setLabelInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateLabel(connection.id, labelInput);
                            } else if (e.key === 'Escape') {
                              setEditingLabel(null);
                            }
                          }}
                          className="h-8"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdateLabel(connection.id, labelInput)}
                        >
                          שמור
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingLabel(null)}
                        >
                          ביטול
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="font-medium text-primary cursor-pointer hover:underline"
                        onClick={() => {
                          setEditingLabel(connection.id);
                          setLabelInput(connection.account_label);
                        }}
                      >
                        {connection.account_label}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                        <CheckCircle className="h-3 w-3 ml-1" />
                        מחובר
                      </Badge>
                      <span className="text-sm text-muted-foreground">{connection.email}</span>
                    </div>
                    {connection.last_sync_at && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        סנכרון אחרון: {new Date(connection.last_sync_at).toLocaleString('he-IL')}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDisconnect(connection.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowImportOptions(connection.id)}
                    disabled={syncing === connection.id}
                    className="flex-1"
                    size="sm"
                  >
                    {syncing === connection.id ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        מסנכרן...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 ml-2" />
                        סנכרון
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}

            <div className="bg-accent/50 rounded-lg p-3 border border-accent">
              <div className="flex items-start gap-2">
                <RefreshCw className="h-4 w-4 text-accent-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-accent-foreground">
                  <strong>סנכרון אוטומטי:</strong> כל החשבונות מסתנכרנים אוטומטית כל יום ב-8:00 בבוקר
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                חבר עד 3 חשבונות Gmail כדי לייבא חשבוניות אוטומטית:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>קבצים מצורפים (PDF, תמונות)</li>
                <li>לינקים לחשבוניות בתוכן המייל</li>
                <li>זיהוי אוטומטי של מיילים עם מילות מפתח (חשבונית, קבלה...)</li>
              </ul>
            </div>

            <Button
              onClick={() => handleConnect('תיבת מייל ראשית')}
              disabled={connecting}
              className="w-full"
              size="lg"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 ml-2" />
              )}
              חבר חשבון Gmail ראשון
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}