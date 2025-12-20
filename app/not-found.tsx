import Link from 'next/link';
import { Logo, Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <Logo size="md" className="mx-auto mb-8" />
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-brand-gold/10 flex items-center justify-center">
          <span className="text-4xl font-bold text-brand-gold">404</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-gray-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/overview">
            <Button variant="primary">Go to Dashboard</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline">Back to Login</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
