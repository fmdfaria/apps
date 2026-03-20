import { Pressable, View } from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { AppText } from '@/components/ui/app-text';
import type { StatusTone } from '@/types/status';

type ListItemProps = {
  title: string;
  subtitle: string;
  meta: string;
  badgeLabel: string;
  badgeTone?: StatusTone;
  onPress?: () => void;
};

export function ListItem({ title, subtitle, meta, badgeLabel, badgeTone = 'neutral', onPress }: ListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-surface-border bg-surface-card p-4 web:transition web:duration-150 web:hover:border-brand-200"
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.99 : 1 }] }]}
    >
      <View className="flex-row items-center gap-3">
        <Avatar name={title} />
        <View className="flex-1 gap-1">
          <AppText className="text-base font-semibold text-content-primary">{title}</AppText>
          <AppText className="text-sm text-content-secondary">{subtitle}</AppText>
        </View>
        <StatusBadge label={badgeLabel} tone={badgeTone} />
      </View>
      <AppText className="mt-3 text-xs font-medium text-content-muted">{meta}</AppText>
    </Pressable>
  );
}
