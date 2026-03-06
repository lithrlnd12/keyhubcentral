'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-brand-black border-t border-gray-700/50 rounded-t-2xl',
          'max-h-[85vh] flex flex-col',
          'animate-slide-up'
        )}
      >
        {/* Handle + Header */}
        <div className="flex-shrink-0 pt-3 pb-2 px-5">
          <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
          {title && (
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-6 safe-area-bottom">
          {children}
        </div>
      </div>
    </div>
  );
}
