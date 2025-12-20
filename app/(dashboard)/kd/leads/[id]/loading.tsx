import { Spinner } from '@/components/ui/Spinner';

export default function LeadDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
        <div className="h-8 w-64 bg-gray-700 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-gray-700 rounded-full animate-pulse" />
          <div className="h-6 w-20 bg-gray-700 rounded-full animate-pulse" />
          <div className="h-6 w-24 bg-gray-700 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 space-y-4">
          <div className="h-6 w-40 bg-gray-700 rounded animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 space-y-4">
          <div className="h-6 w-32 bg-gray-700 rounded animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
