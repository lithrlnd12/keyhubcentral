import { Briefcase } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

interface ContractorJobsProps {
  contractorId: string;
}

export function ContractorJobs({ contractorId }: ContractorJobsProps) {
  // TODO: Integrate with jobs collection in Phase 3
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center">
          <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">Jobs Coming Soon</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Job assignments and history will be available in Phase 3: Key Renovations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
