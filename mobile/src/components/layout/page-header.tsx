import { type ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { cn } from '@/lib/cn';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, rightSlot, className }: PageHeaderProps) {
  return (
    <View className={cn('mb-3 gap-1.5', className)}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <AppText className="text-xl font-bold tracking-tight text-content-primary">{title}</AppText>
          {subtitle ? <AppText className="mt-1 text-sm text-content-secondary">{subtitle}</AppText> : null}
        </View>
        {rightSlot}
      </View>
    </View>
  );
}
