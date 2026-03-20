import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { MenuItem } from '@/components/ui/menu-item';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import { routes } from '@/navigation/routes';
import { useToast } from '@/providers/toast-provider';

export function MoreScreen() {
  const router = useRouter();
  const { logout, canAccessFeature, permissions } = useAuth();
  const { showToast } = useToast();

  const canViewWaitlist = hasRoutePermission(permissions, { path: '/fila-de-espera', method: 'GET' });
  const canViewRelease = hasRoutePermission(permissions, { path: '/agendamentos-liberar/:id', method: 'PUT' });
  const canViewReleaseParticular = hasRoutePermission(permissions, { path: '/agendamentos-liberar-particular/:id', method: 'PUT' });

  return (
    <AppScreen>
      <PageHeader title="Mais" subtitle="Acesso rápido para módulos secundários" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        {canViewRelease ? (
          <MenuItem title="Liberação" subtitle="Libere agendamentos pendentes" icon="lock-open-outline" onPress={() => router.push(routes.release)} />
        ) : null}

        {canViewReleaseParticular ? (
          <MenuItem
            title="Liberação particulares"
            subtitle="Libere agendamentos particulares"
            icon="cash-outline"
            onPress={() => router.push(routes.releaseParticular)}
          />
        ) : null}

        {canViewWaitlist ? (
          <MenuItem title="Fila de espera" subtitle="Gerencie a fila de pacientes" icon="people-circle-outline" onPress={() => router.push(routes.waitlist)} />
        ) : null}

        {canAccessFeature('notificacoes') ? (
          <MenuItem
            title="Notificações"
            subtitle="Central de alertas"
            icon="notifications-outline"
            onPress={() => router.push(routes.notifications)}
          />
        ) : null}

        {canAccessFeature('configuracoes') ? (
          <MenuItem title="Configurações" subtitle="Preferências do app" icon="settings-outline" onPress={() => router.push(routes.settings)} />
        ) : null}

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
