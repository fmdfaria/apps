import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/cn';

type CardProps = ViewProps & {
  className?: string;
};

export function Card({ className, ...props }: CardProps) {
  return (
    <View
      className={cn(
        'rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card',
        'web:hover:border-brand-200 web:hover:shadow-lg',
        className,
      )}
      {...props}
    />
  );
}
