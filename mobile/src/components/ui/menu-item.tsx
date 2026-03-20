import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { tokens } from '@/theme';

type MenuItemProps = {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
};

export function MenuItem({ title, subtitle, icon, onPress }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-surface-border bg-surface-card p-4 web:transition web:duration-150 web:hover:border-brand-200"
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.99 : 1 }] }]}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
          <Ionicons name={icon} size={18} color={tokens.colors.primary} />
        </View>
        <View className="flex-1">
          <AppText className="text-base font-semibold text-content-primary">{title}</AppText>
          {subtitle ? <AppText className="mt-0.5 text-sm text-content-secondary">{subtitle}</AppText> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={tokens.colors.textMuted} />
      </View>
    </Pressable>
  );
}
