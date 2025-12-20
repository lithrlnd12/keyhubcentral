import Link from 'next/link';
import { Button, Card } from '@/components/ui';

export default function DashboardNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-gold/10 flex items-center justify-center">
          <span className="text-2xl font-bold text-brand-gold">404</span>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Page not found</h2>
        <p className="text-gray-400 mb-6">
          This page doesn&apos;t exist or you don&apos;t have permission to view it.
        </p>
        <Link href="/overview">
          <Button variant="primary">Back to Overview</Button>
        </Link>
      </Card>
    </div>
  );
}
