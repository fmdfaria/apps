import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { MenuItem } from '@/components/ui/menu-item';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import { useFooterMenus } from '@/features/navigation/context/footer-menu-context';
import { routes } from '@/navigation/routes';
import { useToast } from '@/providers/toast-provider';

export function MoreScreen() {
  const router = useRouter();
  const { logout, canAccessFeature, permissions } = useAuth();
  const { isSelected } = useFooterMenus();
  const { showToast } = useToast();

  const canViewWaitlist = hasRoutePermission(permissions, { path: '/fila-de-espera', method: 'GET' });
  const canViewRelease = hasRoutePermission(permissions, { path: '/agendamentos-liberar/:id', method: 'PUT' });
  const canViewReleaseParticular = hasRoutePermission(permissions, { path: '/agendamentos-liberar-particular/:id', method: 'PUT' });

  return (
    <AppScreen>
      <PageHeader title="Mais" subtitle="Acesso rápido para módulos secundários" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        {canAccessFeature('atendimento') && !isSelected('atendimento') ? (
          <MenuItem title="Atendimento" subtitle="Acesso às ações de atendimento" icon="medkit-outline" onPress={() => router.push(routes.tabsAtendimento)} />
        ) : null}

        {canAccessFeature('atendimentos') && !isSelected('agendamentos') ? (
          <MenuItem title="Agendamentos" subtitle="Agenda operacional de atendimentos" icon="calendar-outline" onPress={() => router.push(routes.tabsAgendamentos)} />
        ) : null}

        {canAccessFeature('pacientes') && !isSelected('customers') ? (
          <MenuItem title="Pacientes" subtitle="Lista e gestão de pacientes" icon="people-outline" onPress={() => router.push(routes.tabsPacientes)} />
        ) : null}

        {canAccessFeature('agenda') && !isSelected('calendar') ? (
          <MenuItem title="Agenda" subtitle="Minha agenda do profissional" icon="today-outline" onPress={() => router.push(routes.tabsAgenda)} />
        ) : null}

        {canViewRelease && !isSelected('release') ? (
          <MenuItem title="Liberação" subtitle="Libere agendamentos pendentes" icon="lock-open-outline" onPress={() => router.push(routes.tabsRelease)} />
        ) : null}

        {canViewReleaseParticular && !isSelected('releaseParticular') ? (
          <MenuItem
            title="Liberação particulares"
            subtitle="Libere agendamentos particulares"
            icon="cash-outline"
            onPress={() => router.push(routes.tabsReleaseParticular)}
          />
        ) : null}

        {canViewWaitlist && !isSelected('waitlist') ? (
          <MenuItem title="Fila de espera" subtitle="Gerencie a fila de pacientes" icon="people-circle-outline" onPress={() => router.push(routes.tabsWaitlist)} />
        ) : null}

        {canAccessFeature('notificacoes') ? (
          <MenuItem
            title="Notificações"
            subtitle="Central de alertas"
            icon="notifications-outline"
            onPress={() => router.push(routes.notifications)}
          />
        ) : null}

        <MenuItem title="Configurações" subtitle="Preferências do app" icon="settings-outline" onPress={() => router.push(routes.settings)} />

        <MenuItem
          title="Sair"
          subtitle="Encerrar sessão deste dispositivo"
          icon="log-out-outline"
          onPress={() => {
            void logout().then(() => {
              showToast({ message: 'Sessão encerrada.' });
              router.replace(routes.authLogin);
            });
          }}
        />
      </ScrollView>
    </AppScreen>
  );
}
