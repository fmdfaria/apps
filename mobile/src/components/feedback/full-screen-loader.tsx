import { ActivityIndicator, View } from 'react-native';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { tokens } from '@/theme';

type FullScreenLoaderProps = {
  message?: string;
};

export function FullScreenLoader({ message = 'Carregando sessão...' }: FullScreenLoaderProps) {
  return (
    <AppScreen contentClassName="items-center justify-center">
      <View className="items-center gap-3 rounded-2xl border border-surface-border bg-surface-card px-6 py-5">
        <ActivityIndicator size="small" color={tokens.colors.primary} />
        <AppText className="text-sm font-semibold text-content-secondary">{message}</AppText>
      </View>
    </AppScreen>
  );
}
