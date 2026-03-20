import { Text as RNText, type TextProps } from 'react-native';
import { cn } from '@/lib/cn';

type AppTextProps = TextProps & {
  className?: string;
};

export function AppText({ className, ...props }: AppTextProps) {
  return <RNText className={cn('text-content-primary', className)} {...props} />;
}
