import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowRight, Shield, Users, FileText, CreditCard, Search, Loader2, RefreshCw, Plus, Coins } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface UserWithStats extends User {
  invoice_count: number;
  subscription_status: string;
  company_name: string | null;
  current_month_usage: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDocuments: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
  });
  
  // Add credits modal
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState('10');
  const [addingCredits, setAddingCredits] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
      return;
    }

    if (user) {
      checkAdminRole();
    }
  }, [authLoading, user, navigate]);

  const checkAdminRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .single();

      if (error || !data) {
        toast.error('אין לך הרשאות לצפות בדף זה');
        navigate('/dashboard', { replace: true });
        return;
      }

      setIsAdmin(true);
      await fetchData();
    } catch (error) {
      console.error('Error checking admin role:', error);
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      // Get current month
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Fetch invoices count
      const { count: invoiceCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true });

      // Fetch subscriptions
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('status');

      const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0;

      // Fetch customers with their details
      const { data: customers } = await supabase
        .from('customers')
        .select(`
          id,
          user_id,
          email,
          name,
          created_at
        `);

      // Fetch user settings
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('user_id, company_name');

      // Fetch subscriptions by customer
      const { data: customerSubscriptions } = await supabase
        .from('subscriptions')
        .select('customer_id, status');

      // Fetch invoice counts per user
      const { data: invoiceCounts } = await supabase
        .from('invoices')
        .select('user_id');

      // Fetch current month document usage
      const { data: documentUsage } = await supabase
        .from('document_usage')
        .select('user_id, document_count')
        .eq('month_year', monthYear);

      // Build user stats
      const userMap = new Map<string, UserWithStats>();
      
      customers?.forEach(c => {
        const settings = userSettings?.find(s => s.user_id === c.user_id);
        const sub = customerSubscriptions?.find(s => s.customer_id === c.id);
        const invoices = invoiceCounts?.filter(i => i.user_id === c.user_id) || [];
        const usage = documentUsage?.find(u => u.user_id === c.user_id);
        
        userMap.set(c.user_id, {
          id: c.user_id,
          email: c.email,
          created_at: c.created_at,
          last_sign_in_at: null,
          invoice_count: invoices.length,
          subscription_status: sub?.status || 'free',
          company_name: settings?.company_name || null,
          current_month_usage: usage?.document_count || 0,
        });
      });

      setUsers(Array.from(userMap.values()));
      setStats({
        totalUsers: customers?.length || 0,
        totalDocuments: invoiceCount || 0,
        activeSubscriptions,
        monthlyRevenue: activeSubscriptions * 17.9,
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('שגיאה בטעינת נתונים');
    }
  };

  const handleOpenCreditsModal = (u: UserWithStats) => {
    setSelectedUser(u);
    setCreditsToAdd('10');
    setCreditsModalOpen(true);
  };

  const handleAddCredits = async () => {
    if (!selectedUser) return;
    
    const credits = parseInt(creditsToAdd);
    if (isNaN(credits) || credits <= 0) {
      toast.error('יש להזין מספר חיובי');
      return;
    }

    setAddingCredits(true);
    
    try {
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // Check if usage record exists
      const { data: existing } = await supabase
        .from('document_usage')
        .select('id, document_count')
        .eq('user_id', selectedUser.id)
        .eq('month_year', monthYear)
        .maybeSingle();

      if (existing) {
        // Decrease usage (add credits = reduce used count, but not below 0)
        const newCount = Math.max(0, existing.document_count - credits);
        await supabase
          .from('document_usage')
          .update({ document_count: newCount })
          .eq('id', existing.id);
      } else {
        // Create new record with negative count (credits available)
        // Actually, we'll set it to 0 since there's no existing usage
        await supabase
          .from('document_usage')
          .insert({ 
            user_id: selectedUser.id, 
            month_year: monthYear, 
            document_count: 0 
          });
      }

      toast.success(`נוספו ${credits} קרדיטים למשתמש ${selectedUser.email}`);
      setCreditsModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error('Error adding credits:', error);
      toast.error('שגיאה בהוספת קרדיטים');
    } finally {
      setAddingCredits(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">פעיל</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500">ניסיון</Badge>;
      case 'canceled':
        return <Badge variant="destructive">בוטל</Badge>;
      default:
        return <Badge variant="secondary">חינם</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">ממשק מנהל</h1>
          </div>
          <Button variant="outline" size="sm" className="mr-auto" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 ml-1" />
            רענון
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>סה"כ משתמשים</CardDescription>
              <CardTitle className="text-3xl">{stats.totalUsers}</CardTitle>
            </CardHeader>
            <CardContent>
              <Users className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>סה"כ מסמכים</CardDescription>
              <CardTitle className="text-3xl">{stats.totalDocuments}</CardTitle>
            </CardHeader>
            <CardContent>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>מנויים פעילים</CardDescription>
              <CardTitle className="text-3xl">{stats.activeSubscriptions}</CardTitle>
            </CardHeader>
            <CardContent>
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>הכנסה חודשית</CardDescription>
              <CardTitle className="text-3xl">${stats.monthlyRevenue.toFixed(2)}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-muted-foreground">משוער</span>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">משתמשים</TabsTrigger>
            <TabsTrigger value="subscriptions">מנויים</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>רשימת משתמשים</CardTitle>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="חיפוש..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>אימייל</TableHead>
                      <TableHead>שם חברה</TableHead>
                      <TableHead>מסמכים</TableHead>
                      <TableHead>שימוש החודש</TableHead>
                      <TableHead>סטטוס מנוי</TableHead>
                      <TableHead>תאריך הצטרפות</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>{u.company_name || '-'}</TableCell>
                        <TableCell>{u.invoice_count}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {u.current_month_usage} / {u.subscription_status === 'active' ? '50' : '10'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(u.subscription_status)}</TableCell>
                        <TableCell>
                          {new Date(u.created_at).toLocaleDateString('he-IL')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCreditsModal(u)}
                          >
                            <Coins className="h-4 w-4 ml-1" />
                            הוסף קרדיטים
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          לא נמצאו משתמשים
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle>סטטיסטיקות מנויים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</p>
                    <p className="text-sm text-muted-foreground">מנויים פעילים</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-2xl font-bold">{stats.totalUsers - stats.activeSubscriptions}</p>
                    <p className="text-sm text-muted-foreground">משתמשי חינם</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-2xl font-bold text-primary">
                      {stats.totalUsers > 0 
                        ? ((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1)
                        : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">אחוז המרה</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Credits Modal */}
      <Dialog open={creditsModalOpen} onOpenChange={setCreditsModalOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              הוספת קרדיטים
            </DialogTitle>
            <DialogDescription>
              הוספת קרדיטים למשתמש: <strong>{selectedUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-3 rounded-lg space-y-1">
              <p className="text-sm text-muted-foreground">שימוש נוכחי החודש:</p>
              <p className="text-lg font-bold">
                {selectedUser?.current_month_usage || 0} / {selectedUser?.subscription_status === 'active' ? '50' : '10'}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="credits">כמות קרדיטים להוספה</Label>
              <Input
                id="credits"
                type="number"
                min="1"
                value={creditsToAdd}
                onChange={(e) => setCreditsToAdd(e.target.value)}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                הקרדיטים יופחתו מהשימוש הנוכחי (לא יורד מתחת ל-0)
              </p>
            </div>
            
            <div className="flex gap-2">
              {[5, 10, 25, 50].map(amount => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setCreditsToAdd(String(amount))}
                  className={creditsToAdd === String(amount) ? 'border-primary' : ''}
                >
                  +{amount}
                </Button>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditsModalOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleAddCredits} disabled={addingCredits}>
              {addingCredits ? (
                <Loader2 className="h-4 w-4 ml-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 ml-1" />
              )}
              הוסף קרדיטים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
