import { View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';

type EmptyStateProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  onPressCta?: () => void;
};

export function EmptyState({ title, description, ctaLabel, onPressCta }: EmptyStateProps) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-surface-border bg-surface-card px-6 py-8">
      <View className="h-12 w-12 rounded-full bg-brand-50" />
      <AppText className="mt-4 text-center text-lg font-semibold text-content-primary">{title}</AppText>
      <AppText className="mt-2 text-center text-sm leading-5 text-content-secondary">{description}</AppText>
      {ctaLabel && onPressCta ? <Button label={ctaLabel} onPress={onPressCta} className="mt-5 min-w-44" /> : null}
    </View>
  );
}
