import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'full' | 'icon';
}

export function Logo({ size = 'md', showText = false, variant = 'full' }: LogoProps) {
  const sizes = {
    sm: { width: 100, height: 40 },
    md: { width: 140, height: 56 },
    lg: { width: 180, height: 72 },
    xl: { width: 240, height: 96 },
  };

  const iconSizes = {
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 56, height: 56 },
    xl: { width: 72, height: 72 },
  };

  if (variant === 'icon') {
    // Just show the KK icon part (you'll need to create an icon-only version)
    return (
      <div
        className="flex items-center justify-center bg-gradient-to-br from-brand-gold-light to-brand-gold-dark rounded-lg font-bold text-brand-black"
        style={{ width: iconSizes[size].width, height: iconSizes[size].height }}
      >
        <span className={size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'}>
          KH
        </span>
      </div>
    );
  }

  return (
    <Image
      src="/logo.png"
      alt="KeyHub Central"
      width={sizes[size].width}
      height={sizes[size].height}
      priority
      className="object-contain"
    />
  );
}
