import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UploadLink {
  id: string;
  link_code: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
}

// Simple password hashing function
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate random link code
function generateLinkCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function useUploadLinks() {
  const { user } = useAuth();
  const [links, setLinks] = useState<UploadLink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = async () => {
    if (!user) {
      setLinks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('upload_links')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching upload links:', error);
      toast.error('שגיאה בטעינת לינקים');
    } else {
      setLinks(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLinks();
  }, [user]);

  const createLink = async (name: string, password: string): Promise<UploadLink | null> => {
    if (!user) {
      toast.error('יש להתחבר תחילה');
      return null;
    }

    if (!password || password.length < 4) {
      toast.error('הסיסמה חייבת להכיל לפחות 4 תווים');
      return null;
    }

    try {
      const linkCode = generateLinkCode();
      const passwordHash = await hashPassword(password);

      const { data, error } = await supabase
        .from('upload_links')
        .insert({
          user_id: user.id,
          link_code: linkCode,
          password_hash: passwordHash,
          name: name || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating link:', error);
        toast.error('שגיאה ביצירת לינק');
        return null;
      }

      setLinks(prev => [data, ...prev]);
      toast.success('לינק נוצר בהצלחה!');
      return data;
    } catch (error) {
      console.error('Error creating link:', error);
      toast.error('שגיאה ביצירת לינק');
      return null;
    }
  };

  const toggleLinkActive = async (linkId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('upload_links')
      .update({ is_active: isActive })
      .eq('id', linkId);

    if (error) {
      console.error('Error updating link:', error);
      toast.error('שגיאה בעדכון לינק');
      return;
    }

    setLinks(prev => prev.map(link => 
      link.id === linkId ? { ...link, is_active: isActive } : link
    ));
    toast.success(isActive ? 'הלינק הופעל' : 'הלינק הושבת');
  };

  const deleteLink = async (linkId: string) => {
    const { error } = await supabase
      .from('upload_links')
      .delete()
      .eq('id', linkId);

    if (error) {
      console.error('Error deleting link:', error);
      toast.error('שגיאה במחיקת לינק');
      return;
    }

    setLinks(prev => prev.filter(link => link.id !== linkId));
    toast.success('הלינק נמחק');
  };

  const getUploadUrl = (linkCode: string): string => {
    return `${window.location.origin}/upload/${linkCode}`;
  };

  return {
    links,
    loading,
    createLink,
    toggleLinkActive,
    deleteLink,
    getUploadUrl,
    refetch: fetchLinks,
  };
}
