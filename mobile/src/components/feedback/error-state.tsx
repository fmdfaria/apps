import { View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Verifique sua conexão e tente novamente.',
  onRetry,
}: ErrorStateProps) {
  return (
    <View className="rounded-2xl border border-red-100 bg-red-50 px-5 py-5">
      <AppText className="text-base font-semibold text-content-danger">{title}</AppText>
      <AppText className="mt-1 text-sm text-content-secondary">{description}</AppText>
      {onRetry ? <Button label="Tentar novamente" variant="secondary" onPress={onRetry} className="mt-4" /> : null}
    </View>
  );
}

