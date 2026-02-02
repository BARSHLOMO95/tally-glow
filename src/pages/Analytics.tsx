import { useState, useMemo } from 'react';
import { useInvoices } from '@/hooks/useInvoices';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertCircle,
  Lightbulb,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

interface MonthlyData {
  month: string;
  amount: number;
  invoiceCount: number;
  avgPerInvoice: number;
}

interface CategoryData {
  name: string;
  value: number;
  count: number;
}

interface Insight {
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
}

export default function Analytics() {
  const { user } = useAuth();
  const { invoices, loading } = useInvoices(user?.id);
  const [timeRange, setTimeRange] = useState<'6months' | '12months' | 'all'>('6months');

  // Calculate monthly trends
  const monthlyData = useMemo<MonthlyData[]>(() => {
    if (!invoices || invoices.length === 0) return [];

    const now = new Date();
    const monthsCount = timeRange === '6months' ? 6 : timeRange === '12months' ? 12 : 24;
    const startDate = subMonths(now, monthsCount - 1);

    const months = eachMonthOfInterval({
      start: startOfMonth(startDate),
      end: endOfMonth(now),
    });

    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthInvoices = invoices.filter((invoice) => {
        const date = new Date(invoice.document_date);
        return date >= monthStart && date <= monthEnd;
      });

      const totalAmount = monthInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      return {
        month: format(month, 'MMM yyyy', { locale: he }),
        amount: totalAmount,
        invoiceCount: monthInvoices.length,
        avgPerInvoice: monthInvoices.length > 0 ? totalAmount / monthInvoices.length : 0,
      };
    });
  }, [invoices, timeRange]);

  // Calculate category distribution
  const categoryData = useMemo<CategoryData[]>(() => {
    if (!invoices) return [];

    const categoryMap = new Map<string, { amount: number; count: number }>();

    invoices.forEach((invoice) => {
      const category = invoice.category || 'ללא קטגוריה';
      const existing = categoryMap.get(category) || { amount: 0, count: 0 };
      categoryMap.set(category, {
        amount: existing.amount + (invoice.total_amount || 0),
        count: existing.count + 1,
      });
    });

    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories
  }, [invoices]);

  // Generate smart insights
  const insights = useMemo<Insight[]>(() => {
    if (!monthlyData || monthlyData.length < 2) return [];

    const currentMonth = monthlyData[monthlyData.length - 1];
    const previousMonth = monthlyData[monthlyData.length - 2];
    const avgMonthly = monthlyData.reduce((sum, m) => sum + m.amount, 0) / monthlyData.length;

    const insights: Insight[] = [];

    // Compare to previous month
    const percentChange = ((currentMonth.amount - previousMonth.amount) / previousMonth.amount) * 100;

    if (Math.abs(percentChange) > 20) {
      insights.push({
        type: percentChange > 0 ? 'negative' : 'positive',
        title: percentChange > 0 ? 'עלייה משמעותית בהוצאות' : 'ירידה משמעותית בהוצאות',
        description: `ההוצאות ${percentChange > 0 ? 'עלו' : 'ירדו'} ב-${Math.abs(percentChange).toFixed(0)}% לעומת החודש הקודם (${formatCurrency(Math.abs(currentMonth.amount - previousMonth.amount))})`,
      });
    }

    // Compare to average
    if (currentMonth.amount > avgMonthly * 1.3) {
      insights.push({
        type: 'negative',
        title: 'חודש יקר מהרגיל',
        description: `החודש הנוכחי חרג ב-${((currentMonth.amount / avgMonthly - 1) * 100).toFixed(0)}% מהממוצע החודשי שלך`,
      });
    } else if (currentMonth.amount < avgMonthly * 0.7) {
      insights.push({
        type: 'positive',
        title: 'חודש חסכוני',
        description: `החודש הנוכחי נמוך ב-${((1 - currentMonth.amount / avgMonthly) * 100).toFixed(0)}% מהממוצע החודשי שלך`,
      });
    }

    // Check invoice count trends
    const avgInvoiceCount = monthlyData.reduce((sum, m) => sum + m.invoiceCount, 0) / monthlyData.length;
    if (currentMonth.invoiceCount > avgInvoiceCount * 1.5) {
      insights.push({
        type: 'neutral',
        title: 'פעילות גבוהה',
        description: `מספר החשבוניות החודש (${currentMonth.invoiceCount}) גבוה משמעותית מהממוצע`,
      });
    }

    // Check for increasing trend
    const recentMonths = monthlyData.slice(-3);
    const isIncreasing = recentMonths.every((m, i) => i === 0 || m.amount >= recentMonths[i - 1].amount);
    if (isIncreasing && recentMonths.length === 3) {
      insights.push({
        type: 'negative',
        title: 'מגמת עלייה',
        description: 'ההוצאות עולות בצורה עקבית ב-3 החודשים האחרונים',
      });
    }

    // Category insights
    if (categoryData.length > 0) {
      const topCategory = categoryData[0];
      const topCategoryPercent = (topCategory.value / monthlyData.reduce((sum, m) => sum + m.amount, 0)) * 100;
      if (topCategoryPercent > 40) {
        insights.push({
          type: 'neutral',
          title: 'קטגוריה דומיננטית',
          description: `"${topCategory.name}" מהווה ${topCategoryPercent.toFixed(0)}% מכלל ההוצאות`,
        });
      }
    }

    return insights;
  }, [monthlyData, categoryData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalSpent = useMemo(() => {
    return monthlyData.reduce((sum, m) => sum + m.amount, 0);
  }, [monthlyData]);

  const avgMonthly = useMemo(() => {
    return monthlyData.length > 0 ? totalSpent / monthlyData.length : 0;
  }, [totalSpent, monthlyData]);

  const lastMonth = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : null;

  if (loading) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="p-6" dir="rtl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>אין מספיק נתונים</AlertTitle>
          <AlertDescription>
            העלה חשבוניות כדי לראות ניתוח ואנליטיקה
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            דוחות ואנליטיקה
          </h1>
          <p className="text-muted-foreground mt-1">
            ניתוח מעמיק של דפוסי ההוצאות שלך
          </p>
        </div>
        <div className="flex gap-2">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <TabsList>
              <TabsTrigger value="6months">6 חודשים</TabsTrigger>
              <TabsTrigger value="12months">שנה</TabsTrigger>
              <TabsTrigger value="all">הכל</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">סה"כ הוצאות</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              בתקופה שנבחרה
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ממוצע חודשי</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgMonthly)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ממוצע ל-{monthlyData.length} חודשים
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">החודש הנוכחי</CardTitle>
            {lastMonth && lastMonth.amount > avgMonthly ? (
              <TrendingUp className="h-4 w-4 text-destructive" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastMonth ? formatCurrency(lastMonth.amount) : '₪0'}
            </div>
            {lastMonth && (
              <p className="text-xs text-muted-foreground mt-1">
                {lastMonth.amount > avgMonthly ? (
                  <span className="text-destructive">
                    +{((lastMonth.amount / avgMonthly - 1) * 100).toFixed(0)}% מהממוצע
                  </span>
                ) : (
                  <span className="text-green-500">
                    -{((1 - lastMonth.amount / avgMonthly) * 100).toFixed(0)}% מהממוצע
                  </span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <Card className="bg-gradient-to-br from-primary/5 to-purple-600/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              תובנות חכמות
            </CardTitle>
            <CardDescription>ניתוחים אוטומטיים על בסיס הנתונים שלך</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {insights.map((insight, idx) => (
                <Alert
                  key={idx}
                  className={
                    insight.type === 'positive'
                      ? 'border-green-500/50 bg-green-500/5'
                      : insight.type === 'negative'
                      ? 'border-destructive/50 bg-destructive/5'
                      : 'border-primary/50 bg-primary/5'
                  }
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{insight.title}</AlertTitle>
                  <AlertDescription className="text-xs">{insight.description}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>מגמת הוצאות חודשית</CardTitle>
          <CardDescription>עוקב אחרי ההוצאות לאורך זמן</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={monthlyData}>
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

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Invoice Count Trend */}
        <Card>
          <CardHeader>
            <CardTitle>מספר חשבוניות לפי חודש</CardTitle>
            <CardDescription>כמות החשבוניות שהתקבלו</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip contentStyle={{ direction: 'rtl' }} />
                <Bar dataKey="invoiceCount" fill="#8b5cf6" name="מספר חשבוניות" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>התפלגות לפי קטגוריה</CardTitle>
            <CardDescription>הוצאות מחולקות לפי סוג</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name} (${((entry.value / totalSpent) * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ direction: 'rtl' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Average per Invoice */}
        <Card>
          <CardHeader>
            <CardTitle>ממוצע לחשבונית</CardTitle>
            <CardDescription>הסכום הממוצע לכל חשבונית</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₪${value.toFixed(0)}`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ direction: 'rtl' }}
                />
                <Line
                  type="monotone"
                  dataKey="avgPerInvoice"
                  stroke="#ec4899"
                  strokeWidth={2}
                  name="ממוצע"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Categories Table */}
        <Card>
          <CardHeader>
            <CardTitle>קטגוריות מובילות</CardTitle>
            <CardDescription>הקטגוריות עם ההוצאות הגבוהות ביותר</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryData.slice(0, 5).map((category, idx) => (
                <div key={category.name} className="flex items-center gap-3">
                  <div
                    className="h-8 w-1 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{category.name}</span>
                      <span className="text-sm font-bold">{formatCurrency(category.value)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {category.count} חשבוניות
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {((category.value / totalSpent) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${(category.value / totalSpent) * 100}%`,
                          backgroundColor: COLORS[idx % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
