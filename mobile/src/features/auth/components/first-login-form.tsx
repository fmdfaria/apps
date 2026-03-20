import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/context/auth-context';
import { routes } from '@/navigation/routes';
import { useToast } from '@/providers/toast-provider';

type FirstLoginFormErrors = {
  novaSenha?: string;
  confirmacao?: string;
};

function validatePasswords(novaSenha: string, confirmacao: string) {
  const errors: FirstLoginFormErrors = {};

  if (!novaSenha) {
    errors.novaSenha = 'Informe a nova senha.';
  } else if (novaSenha.length < 8) {
    errors.novaSenha = 'A nova senha precisa ter ao menos 8 caracteres.';
  }

  if (!confirmacao) {
    errors.confirmacao = 'Confirme sua nova senha.';
  } else if (confirmacao !== novaSenha) {
    errors.confirmacao = 'As senhas não coincidem.';
  }

  return errors;
}

export function FirstLoginForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const { submitFirstLogin, logout, firstLoginChallenge, isLoading, error, clearError } = useAuth();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => validatePasswords(novaSenha, confirmacao), [confirmacao, novaSenha]);
  const hasErrors = Object.keys(errors).length > 0;

  const handleSubmit = async () => {
    setSubmitted(true);

    if (hasErrors) {
      return;
    }

    try {
      await submitFirstLogin({ novaSenha });
      showToast({ message: 'Senha alterada com sucesso.' });
      router.replace(routes.tabsRoot);
    } catch {
      // estado de erro já é preenchido no contexto
    }
  };

  const handleCancel = async () => {
    await logout();
    router.replace(routes.authLogin);
  };

  return (
    <View className="gap-4">
      <View className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <AppText className="text-xs font-semibold text-amber-700">
          Primeiro acesso para {firstLoginChallenge?.email}. Crie uma nova senha para continuar.
        </AppText>
      </View>

      <Input
        autoCapitalize="none"
        secureTextEntry={!mostrarSenha}
        label="Nova senha"
        onChangeText={(text) => {
          if (error) {
            clearError();
          }
          setNovaSenha(text);
        }}
        placeholder="Mínimo 8 caracteres"
        value={novaSenha}
        error={submitted ? errors.novaSenha : undefined}
        rightSlot={
          <Pressable onPress={() => setMostrarSenha((state) => !state)} className="rounded-md px-1 py-0.5">
            <AppText className="text-sm font-semibold text-brand-700">{mostrarSenha ? 'Ocultar' : 'Mostrar'}</AppText>
          </Pressable>
        }
      />

      <Input
        autoCapitalize="none"
        secureTextEntry={!mostrarConfirmacao}
        label="Confirmar senha"
        onChangeText={(text) => {
          if (error) {
            clearError();
          }
          setConfirmacao(text);
        }}
        placeholder="Repita a nova senha"
        value={confirmacao}
        error={submitted ? errors.confirmacao : undefined}
        rightSlot={
          <Pressable onPress={() => setMostrarConfirmacao((state) => !state)} className="rounded-md px-1 py-0.5">
            <AppText className="text-sm font-semibold text-brand-700">
              {mostrarConfirmacao ? 'Ocultar' : 'Mostrar'}
            </AppText>
          </Pressable>
        }
      />

      {error ? <AppText className="text-center text-xs font-semibold text-content-danger">{error}</AppText> : null}

      <Button
        label="Salvar nova senha"
        onPress={() => void handleSubmit()}
        className="mt-2 w-full"
        size="lg"
        loading={isLoading}
      />
      <Button label="Cancelar" onPress={() => void handleCancel()} variant="secondary" className="w-full" size="md" />
    </View>
  );
}
