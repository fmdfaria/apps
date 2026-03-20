import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScreenLoader } from '@/components/feedback/full-screen-loader';
import { useAuth } from '@/features/auth/context/auth-context';
import { useFooterMenus } from '@/features/navigation/context/footer-menu-context';
import { routes } from '@/navigation/routes';
import { tokens } from '@/theme';

export default function TabsLayout() {
  const { isInitializing, isAuthenticated } = useAuth();
  const { isReady, isSelected } = useFooterMenus();
  const insets = useSafeAreaInsets();

  if (isInitializing || !isReady) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Redirect href={routes.authLogin} />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: tokens.colors.primary,
        tabBarInactiveTintColor: tokens.colors.textMuted,
        tabBarStyle: {
          height: 56 + Math.max(insets.bottom, 8),
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          borderTopColor: tokens.colors.border,
          backgroundColor: tokens.colors.surface,
        },
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            index: 'home-outline',
            atendimento: 'medkit-outline',
            agendamentos: 'calendar-outline',
            customers: 'people-outline',
            calendar: 'today-outline',
            release: 'lock-open-outline',
            'release-particular': 'cash-outline',
            waitlist: 'people-circle-outline',
            more: 'ellipsis-horizontal-circle-outline',
          };

          return <Ionicons name={iconMap[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />

      <Tabs.Screen
        name="atendimento"
        options={{
          title: 'Atendimento',
          href: isSelected('atendimento') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="agendamentos"
        options={{
          title: 'Agendamentos',
          href: isSelected('agendamentos') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Pacientes',
          href: isSelected('customers') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Agenda',
          href: isSelected('calendar') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="release"
        options={{
          title: 'Liberação',
          href: isSelected('release') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="release-particular"
        options={{
          title: 'Particulares',
          href: isSelected('releaseParticular') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="waitlist"
        options={{
          title: 'Fila',
          href: isSelected('waitlist') ? undefined : null,
        }}
      />

      <Tabs.Screen name="more" options={{ title: 'Mais' }} />
    </Tabs>
  );
}
