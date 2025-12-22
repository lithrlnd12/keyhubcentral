import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeStyles = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const sizePixels = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initials = name ? getInitials(name) : '?';

  if (src) {
    return (
      <Image
        src={src}
        alt={name || 'Avatar'}
        width={sizePixels[size]}
        height={sizePixels[size]}
        className={cn(
          'rounded-full object-cover',
          sizeStyles[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-brand-gold/20 text-brand-gold flex items-center justify-center font-medium',
        sizeStyles[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
