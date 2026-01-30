import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, X, Tags, Info } from 'lucide-react';

export const CategoriesTab = () => {
  const { settings, addCategory, removeCategory } = useSettings();
  const [newCategory, setNewCategory] = useState('');

  const handleAddCategory = async () => {
    if (newCategory.trim()) {
      await addCategory(newCategory);
      setNewCategory('');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-purple-500" />
            <CardTitle>ניהול קטגוריות</CardTitle>
          </div>
          <CardDescription>
            נהל את הקטגוריות לסיווג חשבוניות והוצאות
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="הוסף קטגוריה חדשה..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <Button onClick={handleAddCategory} disabled={!newCategory.trim()}>
              <Plus className="h-4 w-4 ml-1" />
              הוסף
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">הקטגוריות שלך</h4>
            <div className="flex flex-wrap gap-2">
              {settings?.custom_categories.map((category) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="text-sm py-1.5 px-3 flex items-center gap-2"
                >
                  {category}
                  <button
                    onClick={() => removeCategory(category)}
                    className="hover:text-destructive transition-colors"
                    aria-label={`הסר ${category}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {settings?.custom_categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                אין קטגוריות. הוסף קטגוריה חדשה למעלה.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            <CardTitle>מידע על קטגוריות</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• הקטגוריות עוזרות לך לסווג ולנתח את ההוצאות שלך</p>
            <p>• אפשר להוסיף קטגוריות מותאמות אישית לפי הצרכים שלך</p>
            <p>• כל חשבונית יכולה להיות משויכת לקטגוריה אחת</p>
            <p>• הקטגוריות מופיעות בדוחות ובמסננים</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
