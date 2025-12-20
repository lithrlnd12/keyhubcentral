import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function JobNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Briefcase className="w-16 h-16 text-gray-600 mb-4" />
      <h1 className="text-2xl font-bold text-white mb-2">Job Not Found</h1>
      <p className="text-gray-400 mb-6 max-w-md">
        The job you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <Link href="/kr">
        <Button>Back to Jobs</Button>
      </Link>
    </div>
  );
}
