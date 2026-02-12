import { useState } from 'react';
import { Navigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { z } from 'zod';
import { FileText, Loader2, Crown, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const authSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
});

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const redirectTo = searchParams.get('redirect') || '/dashboard';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (action: 'signIn' | 'signUp') => {
    const validation = authSchema.safeParse({ email, password });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    
    const { error } = action === 'signIn' 
      ? await signIn(email, password)
      : await signUp(email, password);

    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('פרטי ההתחברות שגויים');
      } else if (error.message.includes('User already registered')) {
        toast.error('משתמש עם כתובת אימייל זו כבר קיים');
      } else {
        toast.error(error.message);
      }
    } else if (action === 'signUp') {
      toast.success('ההרשמה הצליחה! אתה מחובר עכשיו');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectTo}`,
        },
      });
      
      if (error) {
        toast.error('שגיאה בהתחברות עם Google');
        console.error('Google sign in error:', error);
      }
    } catch (error) {
      toast.error('שגיאה בהתחברות עם Google');
      console.error('Google sign in error:', error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-xl border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center">
            <FileText className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">InvoiceAI</CardTitle>
          <CardDescription>התחבר או הירשם כדי להתחיל</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Sign In */}
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin ml-2" />
            ) : (
              <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            המשך עם Google
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              או
            </span>
          </div>

          <Tabs defaultValue="signIn" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signIn">התחברות</TabsTrigger>
              <TabsTrigger value="signUp">הרשמה</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signIn">
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit('signIn'); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signin">אימייל</Label>
                  <Input
                    id="email-signin"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signin">סיסמה</Label>
                  <Input
                    id="password-signin"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                  התחבר
                </Button>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline w-full text-center mt-1"
                  onClick={async () => {
                    if (!email) {
                      toast.error('הזינו כתובת אימייל כדי לאפס סיסמה');
                      return;
                    }
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/auth`,
                    });
                    if (error) {
                      toast.error('שגיאה בשליחת קישור לאיפוס סיסמה');
                    } else {
                      toast.success('קישור לאיפוס סיסמה נשלח לאימייל שלך');
                    }
                  }}
                >
                  שכחת סיסמה?
                </button>
              </form>
            </TabsContent>
            
            <TabsContent value="signUp">
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit('signUp'); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signup">אימייל</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">סיסמה</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    placeholder="לפחות 6 תווים"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                  הירשם
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-0">
          <Separator />
          <div className="w-full p-3 rounded-lg bg-gradient-to-l from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">רוצה יותר מ-10 מסמכים?</span>
              </div>
              <Link to="/pricing">
                <span
                  className={cn(
                    badgeVariants({ variant: 'secondary' }),
                    'cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground'
                  )}
                >
                  <Crown className="w-3 h-3 ml-1" />
                  צפה בתוכניות
                </span>
              </Link>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
