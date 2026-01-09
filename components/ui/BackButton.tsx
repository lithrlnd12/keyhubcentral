'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface BackButtonProps {
  href: string;
  label?: string;
}

export function BackButton({ href, label = 'Back' }: BackButtonProps) {
  return (
    <Link href={href}>
      <Button variant="outline" size="sm">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {label}
      </Button>
    </Link>
  );
}
