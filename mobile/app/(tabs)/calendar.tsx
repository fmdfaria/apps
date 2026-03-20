import { PermissionGate } from '@/features/auth/components/permission-gate';
import { AgendaScreen } from '@/features/agenda/screens/agenda-screen';

export default function CalendarTab() {
  return (
    <PermissionGate feature="agenda" title="Agenda" subtitle="Compromissos e organização do dia">
      <AgendaScreen />
    </PermissionGate>
  );
}
