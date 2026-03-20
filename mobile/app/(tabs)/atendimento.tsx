import { PermissionGate } from '@/features/auth/components/permission-gate';
import { AtendimentoScreen } from '@/features/agendamentos/screens/atendimento-screen';

export default function AtendimentoTab() {
  return (
    <PermissionGate feature="atendimento" title="Atendimento" subtitle="Ações rápidas para atendimentos liberados">
      <AtendimentoScreen />
    </PermissionGate>
  );
}
