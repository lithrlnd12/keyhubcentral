import { Spinner } from '@/components/ui';

export default function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  );
}
