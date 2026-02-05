import { ReactNode } from 'react';
import { Sidebar, MobileSidebar } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useConvertGmailPdfs } from '@/hooks/useConvertGmailPdfs';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();

  // Keep Gmail-ingested PDFs visually consistent with manual uploads (convert to images in background)
  useConvertGmailPdfs(user?.id, !!user);

  // Check if user is admin (you can adjust this based on your auth logic)
  const isAdmin = false; // TODO: Get from user_roles table

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Desktop Sidebar */}
      <Sidebar isAdmin={isAdmin} />

      {/* Main Content Area */}
      <div className="lg:mr-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          <MobileSidebar isAdmin={isAdmin} />

          <div className="flex-1" />

          {/* Search (Desktop only) */}
          <div className="hidden md:flex md:flex-1 md:max-w-md">
            <div className="relative w-full">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" placeholder="חיפוש חשבוניות, ספקים..." className="w-full pr-9" />
            </div>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 left-1 h-2 w-2 rounded-full bg-red-600" />
          </Button>

          {/* User Avatar */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-sm font-semibold text-white">
            {user?.email?.[0].toUpperCase() || 'U'}
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}
