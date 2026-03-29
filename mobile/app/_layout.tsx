import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/features/auth/context/auth-context';
import { FooterMenuProvider } from '@/features/navigation/context/footer-menu-context';
import { ToastProvider } from '@/providers/toast-provider';
import '../global.css';

export default function RootLayout() {
  return (
    <AuthProvider>
      <FooterMenuProvider>
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
              name="customers/orders"
              options={{ headerShown: true, title: 'Pedidos médicos', headerBackButtonDisplayMode: 'minimal' }}
            />
            <Stack.Screen
              name="customers/evolutions"
              options={{ headerShown: true, title: 'Evolução do paciente', headerBackButtonDisplayMode: 'minimal' }}
            />
            <Stack.Screen
              name="agendamentos/actions"
              options={{ headerShown: true, title: 'Ações do atendimento', headerBackButtonDisplayMode: 'minimal' }}
            />
            <Stack.Screen
              name="agendamentos/release-actions"
              options={{ headerShown: true, title: 'Ações da liberação', headerBackButtonDisplayMode: 'minimal' }}
            />
            <Stack.Screen
              name="agendamentos/release-particular-actions"
              options={{ headerShown: true, title: 'Ações da liberação particular', headerBackButtonDisplayMode: 'minimal' }}
            />
            <Stack.Screen
              name="agendamentos/appointment-actions"
              options={{ headerShown: true, title: 'Ações do agendamento', headerBackButtonDisplayMode: 'minimal' }}
            />
            <Stack.Screen
              name="agendamentos/new"
              options={{ headerShown: true, title: 'Novo agendamento', headerBackButtonDisplayMode: 'minimal' }}
            />
            <Stack.Screen
              name="agenda/actions"
              options={{ headerShown: true, title: 'Ações do agendamento', headerBackButtonDisplayMode: 'minimal' }}
            />
            <Stack.Screen name="waitlist" options={{ headerShown: false }} />
            <Stack.Screen name="release" options={{ headerShown: false }} />
            <Stack.Screen name="release-particular" options={{ headerShown: false }} />
            <Stack.Screen name="tasks/index" options={{ headerShown: true, title: 'Tarefas' }} />
            <Stack.Screen name="finance/index" options={{ headerShown: true, title: 'Financeiro' }} />
            <Stack.Screen
              name="finance/create-conta-receber"
              options={{ headerShown: true, title: 'Criar conta a receber', headerBackButtonDisplayMode: 'minimal' }}
            />
            <Stack.Screen name="notifications/index" options={{ headerShown: true, title: 'Notificações' }} />
            <Stack.Screen name="settings" options={{ headerShown: true, title: 'Configurações' }} />
            <Stack.Screen
              name="modals/quick-actions"
              options={{ presentation: 'modal', title: 'Ações rápidas', headerShown: true }}
            />
          </Stack>
        </ToastProvider>
      </FooterMenuProvider>
    </AuthProvider>
  );
}
