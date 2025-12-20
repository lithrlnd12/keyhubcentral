import { Spinner } from '@/components/ui/Spinner';

export default function JobLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-32 bg-gray-700 rounded" />
              <div className="h-6 w-20 bg-gray-700 rounded-full" />
            </div>
            <div className="h-4 w-48 bg-gray-700 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-gray-700 rounded-lg" />
            <div className="h-10 w-24 bg-gray-700 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 bg-gray-800 rounded-lg" />
          ))}
        </div>
        <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800 animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-24 bg-gray-700 rounded" />
                <div className="h-4 w-48 bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
