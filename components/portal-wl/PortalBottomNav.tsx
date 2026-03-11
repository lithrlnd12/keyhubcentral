'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Briefcase, DollarSign, Home, MessageCircle } from 'lucide-react';

interface PortalBottomNavProps {
  slug: string;
  primaryColor: string;
}

export function PortalBottomNav({ slug, primaryColor }: PortalBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { label: 'Home', icon: Home, path: `/p/${slug}/dashboard` },
    { label: 'Projects', icon: Briefcase, path: `/p/${slug}/jobs` },
    { label: 'Invoices', icon: DollarSign, path: `/p/${slug}/invoices` },
    { label: 'Messages', icon: MessageCircle, path: `/p/${slug}/messages` },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-[#1A1A1A]/95 backdrop-blur-sm border-gray-800">
      <div className="flex items-center justify-around py-2 px-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path || pathname.startsWith(tab.path + '/');
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors"
            >
              <Icon
                size={20}
                style={{ color: isActive ? primaryColor : '#6B7280' }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? primaryColor : '#6B7280' }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
