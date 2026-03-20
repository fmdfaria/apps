import { View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { cn } from '@/lib/cn';

type AppScreenProps = ViewProps & {
  className?: string;
  contentClassName?: string;
  edges?: Edge[];
};

export function AppScreen({ className, contentClassName, edges, children, ...props }: AppScreenProps) {
  return (
    <SafeAreaView className={cn('flex-1 bg-surface-background', className)} edges={edges}>
      <View pointerEvents="none" className="absolute -top-20 -right-20 h-44 w-44 rounded-full bg-brand-200/30" />
      <View pointerEvents="none" className="absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-brand-100/50" />

      <View className={cn('flex-1 px-4 py-3', contentClassName)} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}
