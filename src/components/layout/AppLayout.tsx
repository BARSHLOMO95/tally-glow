import { ReactNode } from 'react';
import { Sidebar, MobileSidebar } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useConvertGmailPdfs } from '@/hooks/useConvertGmailPdfs';
import { useUserRole } from '@/hooks/useUserRole';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  // Keep Gmail-ingested PDFs visually consistent with manual uploads (convert to images in background)
  useConvertGmailPdfs(user?.id, !!user);

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
