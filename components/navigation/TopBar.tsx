'use client';

import { Menu } from 'lucide-react';
import { Logo } from '@/components/ui';
import { NotificationDropdown } from '@/components/notifications';
import { useAuth } from '@/lib/hooks';

interface TopBarProps {
  title?: string;
  onMenuClick?: () => void;
}

export function TopBar({ title, onMenuClick }: TopBarProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-brand-black/95 backdrop-blur border-b border-gray-800">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Mobile: Logo & Menu */}
        <div className="flex items-center gap-3 md:hidden">
          <Logo size="sm" variant="icon" />
          {title && (
            <h1 className="text-lg font-semibold text-white">{title}</h1>
          )}
        </div>

        {/* Desktop: Title */}
        <div className="hidden md:block">
          {title && (
            <h1 className="text-xl font-semibold text-white">{title}</h1>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <NotificationDropdown />
        </div>
      </div>
    </header>
  );
}
