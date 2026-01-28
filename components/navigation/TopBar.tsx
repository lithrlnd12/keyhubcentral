'use client';

import { Menu, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Logo } from '@/components/ui';
import { NotificationDropdown } from '@/components/notifications';
import { useAuth } from '@/lib/hooks';
import { useSidebar } from '@/lib/contexts';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { user } = useAuth();
  const { isCollapsed, toggleCollapsed, toggleMobileOpen } = useSidebar();

  return (
    <header className="sticky top-0 z-30 bg-brand-black/95 backdrop-blur border-b border-gray-800">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={toggleMobileOpen}
            className="md:hidden flex items-center justify-center w-10 h-10 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop collapse toggle (only show when sidebar is collapsed to save space) */}
          {isCollapsed && (
            <button
              onClick={toggleCollapsed}
              className="hidden md:flex items-center justify-center w-10 h-10 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          )}

          {/* Mobile: Logo */}
          <div className="md:hidden">
            <Logo size="sm" variant="icon" />
          </div>

          {/* Title */}
          {title && (
            <h1 className="text-lg md:text-xl font-semibold text-white">{title}</h1>
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
