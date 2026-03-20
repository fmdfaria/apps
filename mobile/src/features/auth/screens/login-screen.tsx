import { Image, View } from 'react-native';
import { Card } from '@/components/ui/card';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { LoginForm } from '@/features/auth/components/login-form';

export function LoginScreen() {
  return (
    <AppScreen contentClassName="justify-center">
      <Card className="w-full max-w-[440px] self-center gap-6">
        <View className="items-center gap-4">
          <View className="h-20 w-20 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50">
            <Image
              source={require('../../../../assets/icon.png')}
              style={{ width: 56, height: 56, borderRadius: 12 }}
              accessibilityLabel="Logo do aplicativo"
            />
          </View>

          <View className="items-center gap-2">
            <AppText className="text-center text-3xl font-bold tracking-tight text-content-primary">
              Probotec Clínica
            </AppText>
            <AppText className="text-center text-sm leading-5 text-content-secondary">
              Acesse sua conta para visualizar agenda, pacientes e operações da clínica no mobile.
            </AppText>
          </View>
        </View>

        <LoginForm />
      </Card>
    </AppScreen>
  );
}
