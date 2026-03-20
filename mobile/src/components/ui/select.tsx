import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { cn } from '@/lib/cn';
import { tokens } from '@/theme';

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
};

export function Select({ label, placeholder = 'Selecionar', options, value, onChange, error }: SelectProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => options.find((option) => option.value === value)?.label, [options, value]);

  return (
    <View className="gap-2">
      {label ? <AppText className="text-sm font-semibold text-content-secondary">{label}</AppText> : null}

      <Pressable
        className={cn(
          'flex-row items-center justify-between rounded-xl border border-surface-border bg-surface-card px-3',
          open && 'border-brand-500',
          error && 'border-content-danger',
        )}
        style={{ minHeight: tokens.size.input }}
        onPress={() => setOpen((prev) => !prev)}
      >
        <AppText className={cn('text-base', selectedLabel ? 'text-content-primary' : 'text-content-muted')}>
          {selectedLabel ?? placeholder}
        </AppText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={tokens.colors.textMuted} />
      </Pressable>

      {open ? (
        <View className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
          {options.map((option) => (
            <Pressable
              key={option.value}
              className="border-b border-surface-border px-3 py-3 last:border-b-0 web:hover:bg-brand-50"
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <AppText className={cn('text-sm', value === option.value ? 'font-semibold text-brand-700' : 'text-content-primary')}>
                {option.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {error ? <AppText className="text-xs font-medium text-content-danger">{error}</AppText> : null}
    </View>
  );
}
