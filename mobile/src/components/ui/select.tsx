import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { SearchBar } from '@/components/ui/search-bar';
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
  searchable?: boolean;
  searchPlaceholder?: string;
  searchMinLength?: number;
};

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function Select({
  label,
  placeholder = 'Selecionar',
  options,
  value,
  onChange,
  error,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  searchMinLength = 0,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedLabel = useMemo(() => options.find((option) => option.value === value)?.label, [options, value]);
  const normalizedQuery = useMemo(() => normalizeSearchText(search), [search]);
  const canSearch = !searchable || normalizedQuery.length >= searchMinLength;

  const visibleOptions = useMemo(() => {
    if (!searchable) return options;
    if (!canSearch) return [];

    return options.filter((option) => normalizeSearchText(option.label).includes(normalizedQuery));
  }, [canSearch, normalizedQuery, options, searchable]);

  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

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
          {searchable ? (
            <View className="border-b border-surface-border px-3 py-2">
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder={searchPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ) : null}

          {!canSearch ? (
            <AppText className="px-3 py-3 text-sm text-content-muted">
              Digite ao menos {searchMinLength} caractere(s) para buscar.
            </AppText>
          ) : visibleOptions.length ? (
            <ScrollView nestedScrollEnabled style={{ maxHeight: 260 }}>
              {visibleOptions.map((option) => (
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
            </ScrollView>
          ) : (
            <AppText className="px-3 py-3 text-sm text-content-muted">Nenhum resultado encontrado.</AppText>
          )}
        </View>
      ) : null}

      {error ? <AppText className="text-xs font-medium text-content-danger">{error}</AppText> : null}
    </View>
  );
}
