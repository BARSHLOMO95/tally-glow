import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CreditCard, FileText, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SubscriptionTab = () => {
  const navigate = useNavigate();
  const { subscription, plan, usage, loading, getRemainingDocuments } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const remaining = getRemainingDocuments();
  const total = plan?.document_limit || 10;
  const used = usage?.document_count || 0;
  const percentage = total === Infinity ? 0 : (used / total) * 100;

  const getStatusBadge = () => {
    switch (subscription?.status) {
      case 'active':
        return <Badge className="bg-green-500">פעיל</Badge>;
      case 'free':
        return <Badge variant="secondary">חינם</Badge>;
      case 'canceled':
        return <Badge variant="destructive">מבוטל</Badge>;
      case 'past_due':
        return <Badge variant="destructive">איחור בתשלום</Badge>;
      default:
        return <Badge variant="outline">{subscription?.status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>המנוי שלך</CardTitle>
            </div>
            {getStatusBadge()}
          </div>
          <CardDescription>
            {plan?.name || 'תוכנית חינם'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {plan?.description && (
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          )}

          {subscription?.status === 'active' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">תקופת מנוי נוכחית</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {subscription.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString('he-IL')
                      : 'לא זמין'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={() => navigate('/pricing')}
            variant={subscription?.status === 'free' ? 'default' : 'outline'}
            className="w-full"
          >
            {subscription?.status === 'free' ? 'שדרג את התוכנית' : 'נהל מנוי'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <CardTitle>שימוש במסמכים</CardTitle>
          </div>
          <CardDescription>
            השימוש שלך בחודש הנוכחי ({usage?.month_year})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>מסמכים שנוצרו</span>
              <span className="font-medium">
                {used} / {total === Infinity ? '∞' : total}
              </span>
            </div>
            {total !== Infinity && (
              <Progress value={percentage} className="h-2" />
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">
              {remaining === Infinity
                ? 'מסמכים ללא הגבלה'
                : `נותרו ${remaining} מסמכים החודש`}
            </span>
          </div>

          {subscription?.status === 'free' && remaining < 3 && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-900 dark:text-orange-100">
                אתה מתקרב למגבלת המסמכים החודשית. שקול לשדרג את התוכנית שלך.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {plan?.features && plan.features.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>תכונות התוכנית</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
