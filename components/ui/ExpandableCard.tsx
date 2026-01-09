'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableCardProps {
  id: string;
  icon: ReactNode;
  iconBgColor?: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  expandedId?: string | null;
  onToggle?: (id: string | null) => void;
}

export function ExpandableCard({
  id,
  icon,
  iconBgColor = 'bg-gold/10',
  title,
  subtitle,
  badge,
  summary,
  children,
  defaultExpanded = false,
  expandedId,
  onToggle,
}: ExpandableCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  // Use controlled state if expandedId and onToggle are provided (accordion mode)
  const isControlled = expandedId !== undefined && onToggle !== undefined;
  const isExpanded = isControlled ? expandedId === id : internalExpanded;

  const handleToggle = () => {
    if (isControlled) {
      onToggle(isExpanded ? null : id);
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  return (
    <div className="bg-brand-charcoal border border-gray-800 rounded-xl overflow-hidden transition-all">
      {/* Header - Always visible */}
      <button
        onClick={handleToggle}
        className="w-full p-4 flex items-center gap-4 hover:bg-gray-800/30 transition-colors text-left"
      >
        <div className={cn('p-3 rounded-lg flex-shrink-0', iconBgColor)}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white truncate">{title}</h3>
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-400 truncate">{subtitle}</p>
          )}
          {!isExpanded && summary && (
            <div className="mt-1">{summary}</div>
          )}
        </div>

        <ChevronDown
          className={cn(
            'w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4 border-t border-gray-800">
          <div className="pt-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
