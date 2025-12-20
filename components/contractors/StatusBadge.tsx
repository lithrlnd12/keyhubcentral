import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { ContractorStatus } from '@/types/contractor';

interface StatusBadgeProps {
  status: ContractorStatus;
  className?: string;
}

const statusConfig: Record<ContractorStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'warning' },
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'default' },
  suspended: { label: 'Suspended', variant: 'error' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
