import { StatusBadge } from '@/components/status-badge';
import { VEHICLE_STATUS_META, type VehicleStatus } from '@/lib/status';

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  return <StatusBadge meta={VEHICLE_STATUS_META[status]} />;
}
