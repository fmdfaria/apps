import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/features/auth/context/auth-context';
import { ToastProvider } from '@/providers/toast-provider';
import '../global.css';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="customers/[id]"
            options={{ headerShown: true, title: 'Paciente', headerBackButtonDisplayMode: 'minimal' }}
          />
          <Stack.Screen name="customers/actions" options={{ headerShown: true, title: 'Ações do paciente' }} />
          <Stack.Screen name="customers/edit" options={{ headerShown: true, title: 'Editar paciente' }} />
          <Stack.Screen
            name="customers/attachments"
            options={{ headerShown: true, title: 'Gerenciar anexos', headerBackButtonDisplayMode: 'minimal' }}
          />
          <Stack.Screen
            name="customers/evolutions"
            options={{ headerShown: true, title: 'Evolução do paciente', headerBackButtonDisplayMode: 'minimal' }}
          />
          <Stack.Screen
            name="agendamentos/actions"
            options={{ headerShown: true, title: 'Ações do atendimento', headerBackButtonDisplayMode: 'minimal' }}
          />
          <Stack.Screen name="waitlist" options={{ headerShown: true, title: 'Fila de espera' }} />
          <Stack.Screen name="release" options={{ headerShown: true, title: 'Liberação' }} />
          <Stack.Screen name="release-particular" options={{ headerShown: true, title: 'Liberação particulares' }} />
          <Stack.Screen name="tasks/index" options={{ headerShown: true, title: 'Tarefas' }} />
          <Stack.Screen name="finance/index" options={{ headerShown: true, title: 'Financeiro' }} />
          <Stack.Screen name="notifications/index" options={{ headerShown: true, title: 'Notificações' }} />
          <Stack.Screen name="settings/index" options={{ headerShown: true, title: 'Configurações' }} />
          <Stack.Screen
            name="modals/quick-actions"
            options={{ presentation: 'modal', title: 'Ações rápidas', headerShown: true }}
          />
        </Stack>
      </ToastProvider>
    </AuthProvider>
  );
}

