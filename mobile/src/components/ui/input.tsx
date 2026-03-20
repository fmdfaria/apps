import { type ReactNode, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { cn } from '@/lib/cn';
import { tokens } from '@/theme';

type InputProps = TextInputProps & {
  className?: string;
  label?: string;
  hint?: string;
  error?: string;
  rightSlot?: ReactNode;
};

export function Input({ label, hint, error, className, rightSlot, onFocus, onBlur, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="gap-2">
      {label ? <AppText className="text-sm font-semibold text-content-secondary">{label}</AppText> : null}

      <View
        className={cn(
          'flex-row items-center rounded-xl border bg-surface-card px-3',
          'web:transition web:duration-200',
          isFocused ? 'border-brand-500 bg-brand-50/30' : 'border-surface-border',
          error && 'border-content-danger bg-red-50/60',
          !isFocused && !error && 'web:hover:border-brand-300',
        )}
        style={{ minHeight: tokens.size.input }}
      >
        <TextInput
          className={cn('flex-1 text-base text-content-primary', className)}
          placeholderTextColor={tokens.colors.textMuted}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          {...props}
        />
        {rightSlot}
      </View>

      {error ? (
        <AppText className="text-xs font-medium text-content-danger">{error}</AppText>
      ) : hint ? (
        <AppText className="text-xs text-content-muted">{hint}</AppText>
      ) : null}
    </View>
  );
}
