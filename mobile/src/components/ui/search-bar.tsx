import { Ionicons } from '@expo/vector-icons';
import { TextInput, View, type TextInputProps } from 'react-native';
import { cn } from '@/lib/cn';
import { tokens } from '@/theme';

type SearchBarProps = TextInputProps & {
  className?: string;
};

export function SearchBar({ className, ...props }: SearchBarProps) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-2 rounded-xl border border-surface-border bg-surface-card px-3',
        'web:transition web:duration-150 web:hover:border-brand-300',
        className,
      )}
      style={{ minHeight: tokens.size.input }}
    >
      <Ionicons name="search" size={18} color={tokens.colors.textMuted} />
      <TextInput
        className="flex-1 text-base text-content-primary"
        placeholderTextColor={tokens.colors.textMuted}
        {...props}
      />
    </View>
  );
}
