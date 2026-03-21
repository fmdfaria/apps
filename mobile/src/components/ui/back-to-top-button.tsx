import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/app-text';

type BackToTopButtonProps = {
  visible: boolean;
  onPress: () => void;
  label?: string;
  extraBottom?: number;
};

export function BackToTopButton({ visible, onPress, label = 'Filtros', extraBottom = 0 }: BackToTopButtonProps) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [anim, visible]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        right: 16,
        bottom: insets.bottom + 28 + extraBottom,
        opacity: anim,
        transform: [{ translateY }],
      }}
    >
      <Pressable
        onPress={onPress}
        className="rounded-full border border-brand-800 bg-brand-700 px-4 py-3"
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="arrow-up" size={16} color="#ffffff" />
          <AppText className="text-xs font-semibold text-white">{label}</AppText>
        </View>
      </Pressable>
    </Animated.View>
  );
}
