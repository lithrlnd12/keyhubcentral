import Link from 'next/link';
import { UserX } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ContractorNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <UserX className="w-16 h-16 text-gray-600 mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">Contractor Not Found</h2>
      <p className="text-gray-400 text-center mb-6 max-w-md">
        The contractor you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
      </p>
      <Link href="/kts">
        <Button>Back to Contractors</Button>
      </Link>
    </div>
  );
}
