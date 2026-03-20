import { View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { cn } from '@/lib/cn';

type AvatarProps = {
  name: string;
  size?: 'sm' | 'md' | 'lg';
};

const map = {
  sm: { box: 'h-8 w-8', text: 'text-xs', lineHeight: 32 },
  md: { box: 'h-10 w-10', text: 'text-sm', lineHeight: 40 },
  lg: { box: 'h-12 w-12', text: 'text-base', lineHeight: 48 },
};

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const current = map[size];

  return (
    <View className={cn('items-center justify-center rounded-full bg-brand-100', current.box)}>
      <AppText className={cn('font-bold text-brand-800', current.text)} style={{ lineHeight: current.lineHeight }}>
        {initials}
      </AppText>
    </View>
  );
}
