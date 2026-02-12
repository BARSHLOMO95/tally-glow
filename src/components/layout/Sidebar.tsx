import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Building2,
  BarChart3,
  FolderOpen,
  Link2,
  Settings,
  Shield,
  Trash2,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'סקירה כללית',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'חשבוניות',
    href: '/invoices',
    icon: FileText,
  },
  {
    title: 'ספקים',
    href: '/suppliers',
    icon: Building2,
    badge: 'חדש',
  },
  {
    title: 'דוחות ואנליטיקה',
    href: '/analytics',
    icon: BarChart3,
    badge: 'חדש',
  },
  {
    title: 'קטגוריות',
    href: '/categories',
    icon: FolderOpen,
  },
  {
    title: 'העלאות ציבוריות',
    href: '/upload-links',
    icon: Link2,
  },
  {
    title: 'סל מיחזור',
    href: '/trash',
    icon: Trash2,
  },
];

const bottomNavItems: NavItem[] = [
  {
    title: 'הגדרות',
    href: '/settings',
    icon: Settings,
  },
  {
    title: 'ניהול מערכת',
    href: '/admin',
    icon: Shield,
    adminOnly: true,
  },
];

interface SidebarContentProps {
  onNavigate?: () => void;
  isAdmin?: boolean;
}

function SidebarContent({ onNavigate, isAdmin = false }: SidebarContentProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const filteredBottomItems = bottomNavItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <div className="flex h-full flex-col" dir="rtl">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center border-b px-6">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 font-bold text-xl"
          onClick={onNavigate}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Tally Glow
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground',
                  active
                    ? 'bg-gradient-to-r from-primary/10 to-purple-600/10 text-primary border-r-4 border-primary'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'text-primary')} />
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                  <span className="rounded-full bg-gradient-to-r from-primary to-purple-600 px-2 py-0.5 text-xs text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-4" />

        {/* Bottom Navigation */}
        <nav className="space-y-1">
          {filteredBottomItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground',
                  active
                    ? 'bg-gradient-to-r from-primary/10 to-purple-600/10 text-primary border-r-4 border-primary'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'text-primary')} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Section */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-sm font-semibold text-white">
            {/* First letter of user name - will be dynamic */}
            U
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium">משתמש</p>
            <p className="text-xs text-muted-foreground">חשבון פעיל</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin = false }: SidebarProps) {
  return (
    <aside className="hidden lg:fixed lg:right-0 lg:top-0 lg:z-40 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-l lg:bg-background">
      <SidebarContent isAdmin={isAdmin} />
    </aside>
  );
}

export function MobileSidebar({ isAdmin = false }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="פתח תפריט"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-64 p-0">
        <SidebarContent isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
