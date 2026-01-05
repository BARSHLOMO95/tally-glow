import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { KPIData } from '@/types/invoice';
import { DollarSign, Receipt, Percent, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardsProps {
  data: KPIData;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const KPICards = ({ data }: KPICardsProps) => {
  const [animating, setAnimating] = useState<string | null>(null);
  const [prevData, setPrevData] = useState(data);

  useEffect(() => {
    const changedKeys: string[] = [];
    if (data.totalWithVat !== prevData.totalWithVat) changedKeys.push('totalWithVat');
    if (data.totalBeforeVat !== prevData.totalBeforeVat) changedKeys.push('totalBeforeVat');
    if (data.totalVat !== prevData.totalVat) changedKeys.push('totalVat');
    if (data.uniqueSuppliers !== prevData.uniqueSuppliers) changedKeys.push('uniqueSuppliers');

    if (changedKeys.length > 0) {
      changedKeys.forEach((key, index) => {
        setTimeout(() => {
          setAnimating(key);
          setTimeout(() => setAnimating(null), 300);
        }, index * 100);
      });
    }
    setPrevData(data);
  }, [data, prevData]);

  const cards = [
    {
      key: 'totalWithVat',
      label: 'סה"כ לתשלום',
      value: formatCurrency(data.totalWithVat),
      icon: DollarSign,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      key: 'totalBeforeVat',
      label: 'לפני מע"מ',
      value: formatCurrency(data.totalBeforeVat),
      icon: Receipt,
      gradient: 'from-emerald-500 to-emerald-600',
    },
    {
      key: 'totalVat',
      label: 'סה"כ מע"מ',
      value: formatCurrency(data.totalVat),
      icon: Percent,
      gradient: 'from-pink-500 to-pink-600',
    },
    {
      key: 'uniqueSuppliers',
      label: 'ספקים ייחודיים',
      value: data.uniqueSuppliers.toString(),
      icon: Users,
      gradient: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card
          key={card.key}
          className={cn(
            'overflow-hidden transition-all duration-300 hover:shadow-lg',
            animating === card.key && 'animate-kpi-pulse ring-2 ring-primary'
          )}
        >
          <CardContent className="p-0">
            <div className={`bg-gradient-to-br ${card.gradient} p-4 text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <card.icon className="w-10 h-10 opacity-80" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default KPICards;
