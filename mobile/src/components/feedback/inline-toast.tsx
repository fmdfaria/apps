import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppText } from '@/components/ui/app-text';
import { motion } from '@/theme';

type ToastProps = {
  visible: boolean;
  message: string;
};

export function InlineToast({ visible, message }: ToastProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: motion.quick,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -8 }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={animatedStyle}>
      <View className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <AppText className="text-sm font-semibold text-emerald-700">{message}</AppText>
      </View>
    </Animated.View>
  );
}
