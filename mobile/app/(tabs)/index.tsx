import { PermissionGate } from '@/features/auth/components/permission-gate';
import { DashboardScreen } from '@/features/dashboard/screens/dashboard-screen';

export default function HomeTab() {
  return (
    <PermissionGate feature="dashboard" title="Início" subtitle="Resumo operacional da clínica">
      <DashboardScreen />
    </PermissionGate>
  );
}
