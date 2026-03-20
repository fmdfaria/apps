import { type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { motion } from '@/theme';

type AnimatedSectionProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export function AnimatedSection({ children, delay = 0, className }: AnimatedSectionProps) {
  return (
    <Animated.View entering={FadeInUp.duration(motion.screen).delay(delay)} className={className}>
      {children}
    </Animated.View>
  );
}

export function Section({ children, className }: AnimatedSectionProps) {
  return <View className={className}>{children}</View>;
}
