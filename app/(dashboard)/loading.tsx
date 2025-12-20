import { Spinner } from '@/components/ui';

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}
