import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { UserSettings, DEFAULT_CATEGORIES } from '@/types/settings';
import { toast } from 'sonner';

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSettings();
    } else {
      setSettings(null);
      setLoading(false);
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as UserSettings);
      } else {
        // Create default settings for new user
        const newSettings = await createDefaultSettings();
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('שגיאה בטעינת ההגדרות');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async (): Promise<UserSettings | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          custom_categories: DEFAULT_CATEGORIES,
        })
        .select()
        .single();

      if (error) throw error;
      return data as UserSettings;
    } catch (error) {
      console.error('Error creating default settings:', error);
      return null;
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user || !settings) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      toast.success('ההגדרות נשמרו בהצלחה');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('שגיאה בשמירת ההגדרות');
    }
  };

  const addCategory = async (category: string) => {
    if (!settings) return;
    
    const trimmed = category.trim();
    if (!trimmed || settings.custom_categories.includes(trimmed)) {
      toast.error('קטגוריה כבר קיימת או ריקה');
      return;
    }

    const newCategories = [...settings.custom_categories, trimmed];
    await updateSettings({ custom_categories: newCategories });
  };

  const removeCategory = async (category: string) => {
    if (!settings) return;
    
    const newCategories = settings.custom_categories.filter(c => c !== category);
    await updateSettings({ custom_categories: newCategories });
  };

  const reorderCategories = async (categories: string[]) => {
    await updateSettings({ custom_categories: categories });
  };

  return {
    settings,
    loading,
    updateSettings,
    addCategory,
    removeCategory,
    reorderCategories,
    refetch: fetchSettings,
  };
}
