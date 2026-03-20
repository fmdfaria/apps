import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScreenLoader } from '@/components/feedback/full-screen-loader';
import { useAuth } from '@/features/auth/context/auth-context';
import { routes } from '@/navigation/routes';
import { tokens } from '@/theme';

export default function TabsLayout() {
  const { isInitializing, isAuthenticated, canAccessFeature } = useAuth();
  const insets = useSafeAreaInsets();

  if (isInitializing) {
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
            agendamentos: 'medkit-outline',
            customers: 'people-outline',
            calendar: 'calendar-outline',
            more: 'ellipsis-horizontal-circle-outline',
          };

          return <Ionicons name={iconMap[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          href: canAccessFeature('dashboard') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="atendimento"
        options={{
          title: 'Atendimento',
          href: canAccessFeature('atendimento') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="agendamentos"
        options={{
          title: 'Agendamentos',
          href: canAccessFeature('atendimentos') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Pacientes',
          href: canAccessFeature('pacientes') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Agenda',
          href: canAccessFeature('agenda') ? undefined : null,
        }}
      />
      <Tabs.Screen name="more" options={{ title: 'Mais' }} />
    </Tabs>
  );
}

