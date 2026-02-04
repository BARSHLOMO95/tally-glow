import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useInvoices } from '@/hooks/useInvoices';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Calendar,
  DollarSign,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Building2,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { he } from 'date-fns/locale';

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function Overview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { invoices, loading, kpiData } = useInvoices(user?.id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Last 6 months data
  const last6MonthsData = useMemo(() => {
    if (!invoices) return [];

    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthInvoices = invoices.filter((inv) => {
        const invDate = new Date(inv.document_date);
        return isWithinInterval(invDate, { start: monthStart, end: monthEnd });
      });

      const total = monthInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      months.push({
        month: format(monthDate, 'MMM', { locale: he }),
        amount: total,
        count: monthInvoices.length,
      });
    }

    return months;
  }, [invoices]);

  // Recent invoices (last 10)
  const recentInvoices = useMemo(() => {
    if (!invoices) return [];
    return [...invoices]
      .sort((a, b) => new Date(b.document_date).getTime() - new Date(a.document_date).getTime())
      .slice(0, 10);
  }, [invoices]);

  // Top categories
  const topCategories = useMemo(() => {
    if (!invoices) return [];

    const categoryMap = new Map<string, number>();
    invoices.forEach((inv) => {
      const category = inv.category || 'ללא קטגוריה';
      categoryMap.set(category, (categoryMap.get(category) || 0) + (inv.total_amount || 0));
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [invoices]);

  // Current month vs previous month
  const monthComparison = useMemo(() => {
    if (!invoices) return { current: 0, previous: 0, change: 0 };

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    const currentMonthInvoices = invoices.filter((inv) => {
      const date = new Date(inv.document_date);
      return isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd });
    });

    const previousMonthInvoices = invoices.filter((inv) => {
      const date = new Date(inv.document_date);
      return isWithinInterval(date, { start: previousMonthStart, end: previousMonthEnd });
    });

    const current = currentMonthInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const previous = previousMonthInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return { current, previous, change };
  }, [invoices]);

  if (loading) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            סקירה כללית
          </h1>
          <p className="text-muted-foreground mt-1">ברוך הבא, {user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/invoices')}>
            <FileText className="h-4 w-4 ml-2" />
            כל החשבוניות
          </Button>
          <Button variant="outline" onClick={() => navigate('/analytics')}>
            <PieChartIcon className="h-4 w-4 ml-2" />
            דוחות
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">סה"כ חשבוניות</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {last6MonthsData[last6MonthsData.length - 1]?.count || 0} החודש
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">סה"כ הוצאות</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.totalWithVat)}</div>
            <p className="text-xs text-muted-foreground mt-1">כל הזמנים</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ממוצע לחשבונית</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(invoices?.length > 0 ? kpiData.totalWithVat / invoices.length : 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">ממוצע כללי</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">החודש הנוכחי</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthComparison.current)}</div>
            {monthComparison.change !== 0 && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${monthComparison.change > 0 ? 'text-destructive' : 'text-green-500'}`}>
                {monthComparison.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(monthComparison.change).toFixed(0)}% מהחודש הקודם
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>מגמה חודשית</CardTitle>
            <CardDescription>6 החודשים האחרונים</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={last6MonthsData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ direction: 'rtl' }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#8b5cf6"
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                  name="סכום"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle>קטגוריות מובילות</CardTitle>
            <CardDescription>התפלגות הוצאות</CardDescription>
          </CardHeader>
          <CardContent>
            {topCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={topCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {topCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ direction: 'rtl' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                אין נתוני קטגוריות
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>חשבוניות אחרונות</CardTitle>
            <CardDescription>10 החשבוניות האחרונות שהועלו</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
            הצג הכל
            <ArrowRight className="h-4 w-4 mr-2" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentInvoices.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>אין חשבוניות עדיין</p>
                <Button className="mt-4" onClick={() => navigate('/invoices')}>
                  העלה חשבונית ראשונה
                </Button>
              </div>
            ) : (
              recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/invoices')}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {invoice.supplier_name || 'ללא ספק'}
                        </span>
                        {invoice.category && (
                          <Badge variant="outline" className="text-xs">
                            {invoice.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(invoice.document_date), 'dd/MM/yyyy', { locale: he })}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-bold">{formatCurrency(invoice.total_amount || 0)}</div>
                    {invoice.vat_amount && (
                      <p className="text-xs text-muted-foreground">
                        מע"מ: {formatCurrency(invoice.vat_amount)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/suppliers')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              ניהול ספקים
            </CardTitle>
            <CardDescription>צפה ונהל את כל הספקים שלך</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/analytics')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              דוחות ואנליטיקה
            </CardTitle>
            <CardDescription>ניתוח מעמיק של ההוצאות</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/settings')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              הגדרות
            </CardTitle>
            <CardDescription>התאם אישית את המערכת</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
