'use client';

import { Phone } from 'lucide-react';
import { formatPhone, getPhoneHref } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';

interface PhoneLinkProps {
  phone: string;
  className?: string;
  showIcon?: boolean;
  iconClassName?: string;
}

/**
 * Clickable phone number that opens the phone app.
 * Handles various phone number formats and prevents event bubbling
 * when used inside other clickable elements (like cards).
 */
export function PhoneLink({
  phone,
  className,
  showIcon = false,
  iconClassName,
}: PhoneLinkProps) {
  // Only render if we have enough digits (at least 10 for a valid US number)
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    // Not enough digits for a valid phone, just display as text
    return (
      <span className={cn('text-gray-400', className)}>
        {showIcon && <Phone className={cn('w-4 h-4 inline mr-1.5', iconClassName)} />}
        {phone}
      </span>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent parent Link/button from being triggered
    e.stopPropagation();
  };

  return (
    <a
      href={getPhoneHref(phone)}
      onClick={handleClick}
      className={cn(
        'text-brand-gold hover:text-brand-gold-light hover:underline transition-colors inline-flex items-center',
        className
      )}
    >
      {showIcon && <Phone className={cn('w-4 h-4 mr-1.5 flex-shrink-0', iconClassName)} />}
      {formatPhone(phone)}
    </a>
  );
}
