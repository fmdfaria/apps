import { PermissionGate } from '@/features/auth/components/permission-gate';
import { CustomersScreen } from '@/features/customers/screens/customers-screen';

export default function CustomersTab() {
  return (
    <PermissionGate feature="pacientes" title="Pacientes" subtitle="Relacionamento e acompanhamento de pacientes">
      <CustomersScreen />
    </PermissionGate>
  );
}
