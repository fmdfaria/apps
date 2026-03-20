import { PermissionGate } from '@/features/auth/components/permission-gate';
import { AgendamentosScreen } from '@/features/agendamentos/screens/agendamentos-screen';

export default function AgendamentosTab() {
  return (
    <PermissionGate feature="atendimentos" title="Agendamentos" subtitle="Fluxo de atendimentos com regras do frontend">
      <AgendamentosScreen />
    </PermissionGate>
  );
}
