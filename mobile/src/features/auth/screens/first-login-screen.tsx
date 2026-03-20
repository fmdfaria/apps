import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { Card } from '@/components/ui/card';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { FirstLoginForm } from '@/features/auth/components/first-login-form';
import { useAuth } from '@/features/auth/context/auth-context';
import { routes } from '@/navigation/routes';

export function FirstLoginScreen() {
  const { firstLoginChallenge } = useAuth();

  if (!firstLoginChallenge) {
    return <Redirect href={routes.authLogin} />;
  }

  return (
    <AppScreen contentClassName="justify-center">
      <Card className="w-full max-w-[440px] self-center gap-6">
        <View className="items-center gap-2">
          <AppText className="text-center text-3xl font-bold tracking-tight text-content-primary">Primeiro acesso</AppText>
          <AppText className="text-center text-sm leading-5 text-content-secondary">
            Por segurança, você precisa definir uma nova senha antes de continuar.
          </AppText>
        </View>

        <FirstLoginForm />
      </Card>
    </AppScreen>
  );
}
