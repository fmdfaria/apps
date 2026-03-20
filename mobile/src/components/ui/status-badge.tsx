import { View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { cn } from '@/lib/cn';
import type { StatusTone } from '@/types/status';

const toneClasses: Record<StatusTone, { box: string; text: string }> = {
  info: { box: 'border-blue-100 bg-blue-50', text: 'text-blue-700' },
  success: { box: 'border-emerald-100 bg-emerald-50', text: 'text-emerald-700' },
  warning: { box: 'border-amber-100 bg-amber-50', text: 'text-amber-700' },
  danger: { box: 'border-red-100 bg-red-50', text: 'text-red-700' },
  neutral: { box: 'border-slate-200 bg-slate-100', text: 'text-slate-700' },
};

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const classes = toneClasses[tone];

  return (
    <View className={cn('rounded-full border px-3 py-1', classes.box)}>
      <AppText className={cn('text-xs font-semibold', classes.text)}>{label}</AppText>
    </View>
  );
}
