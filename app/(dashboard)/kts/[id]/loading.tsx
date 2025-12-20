import { Spinner } from '@/components/ui/Spinner';

export default function ContractorDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gray-700 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="h-6 bg-gray-700 rounded w-48" />
            <div className="h-4 bg-gray-700 rounded w-32" />
            <div className="h-4 bg-gray-700 rounded w-24" />
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="bg-brand-charcoal rounded-lg p-1 border border-gray-800 animate-pulse">
        <div className="flex gap-2">
          <div className="h-9 bg-gray-700 rounded w-20" />
          <div className="h-9 bg-gray-700 rounded w-24" />
          <div className="h-9 bg-gray-700 rounded w-28" />
          <div className="h-9 bg-gray-700 rounded w-16" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    </div>
  );
}
