import { PermissionGate } from '@/features/auth/components/permission-gate';
import { ModuleScreen } from '@/features/shared/module-screen';

export default function FinanceRoute() {
  return (
    <PermissionGate feature="financeiro" title="Financeiro" subtitle="Operações financeiras da clínica">
      <ModuleScreen title="Financeiro" subtitle="Contas, indicadores e visão de movimentações" />
    </PermissionGate>
  );
}
