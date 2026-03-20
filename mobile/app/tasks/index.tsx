import { PermissionGate } from '@/features/auth/components/permission-gate';
import { ModuleScreen } from '@/features/shared/module-screen';

export default function TasksRoute() {
  return (
    <PermissionGate feature="tarefas" title="Pendências" subtitle="Acompanhamento de pendências operacionais">
      <ModuleScreen title="Pendências" subtitle="Painel de execução com prioridade e acompanhamento" />
    </PermissionGate>
  );
}
