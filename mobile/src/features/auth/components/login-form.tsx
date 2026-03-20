import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/context/auth-context';
import { LoginFormValues } from '@/features/auth/types';
import { validateLogin } from '@/features/auth/utils/validate-login';
import { routes } from '@/navigation/routes';
import { useToast } from '@/providers/toast-provider';

const initialValues: LoginFormValues = {
  email: '',
  password: '',
};

export function LoginForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const { login, isLoading, error, clearError } = useAuth();
  const [values, setValues] = useState(initialValues);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => validateLogin(values), [values]);
  const hasErrors = Object.keys(errors).length > 0;

  const handleChange = (field: keyof LoginFormValues, value: string) => {
    if (error) {
      clearError();
    }

    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);

    if (hasErrors) {
      return;
    }

    try {
      const result = await login(values.email.trim(), values.password);

      if (result.requiresPasswordChange) {
        showToast({ message: 'Primeiro acesso detectado. Atualize sua senha.' });
        router.replace(routes.authFirstLogin);
        return;
      }

      showToast({ message: 'Login realizado com sucesso.' });
      router.replace(routes.tabsRoot);
    } catch {
      // erro tratado no estado global
    }
  };

  return (
    <View className="gap-4">
      <Input
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label="E-mail"
        onChangeText={(text) => handleChange('email', text)}
        placeholder="voce@empresa.com"
        value={values.email}
        error={submitted ? errors.email : undefined}
      />

      <Input
        autoCapitalize="none"
        autoComplete="password"
        secureTextEntry={!showPassword}
        label="Senha"
        onChangeText={(text) => handleChange('password', text)}
        placeholder="Sua senha"
        value={values.password}
        error={submitted ? errors.password : undefined}
        rightSlot={
          <Pressable
            className="rounded-md px-1 py-0.5 web:transition web:duration-200 web:hover:bg-brand-100"
            onPress={() => setShowPassword((prev) => !prev)}
          >
            <AppText className="text-sm font-semibold text-brand-700">
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </AppText>
          </Pressable>
        }
      />

      {error ? <AppText className="text-center text-xs font-semibold text-content-danger">{error}</AppText> : null}

      <Button label="Entrar" onPress={() => void handleSubmit()} className="mt-2 w-full" size="lg" loading={isLoading} />
      <AppText className="text-center text-xs leading-5 text-content-muted">
        Use as credenciais da plataforma web para acessar sua conta no aplicativo.
      </AppText>
    </View>
  );
}
