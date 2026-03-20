import { PermissionGate } from '@/features/auth/components/permission-gate';
import { ModuleScreen } from '@/features/shared/module-screen';

export default function NotificationsRoute() {
  return (
    <PermissionGate feature="notificacoes" title="Notificações" subtitle="Central de alertas operacionais">
      <ModuleScreen title="Notificações" subtitle="Alertas operacionais com contexto e ação" />
    </PermissionGate>
  );
}
