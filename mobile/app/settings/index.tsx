import { PermissionGate } from '@/features/auth/components/permission-gate';
import { ModuleScreen } from '@/features/shared/module-screen';

export default function SettingsRoute() {
  return (
    <PermissionGate feature="configuracoes" title="Configurações" subtitle="Preferências da conta e do aplicativo">
      <ModuleScreen title="Configurações" subtitle="Preferências de conta, equipe e integrações" />
    </PermissionGate>
  );
}
