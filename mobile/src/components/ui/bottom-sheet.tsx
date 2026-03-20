import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import { Animated as RNAnimated, Modal, PanResponder, Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/app-text';

type BottomSheetProps = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function BottomSheet({ visible, title, onClose, children, footer }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new RNAnimated.Value(0)).current;
  const safeBottom = Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : Math.max(insets.bottom, 8);
  const footerTopPadding = 12;
  const footerBottomPadding = safeBottom;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [translateY, visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 6,
        onPanResponderMove: (_, gestureState) => {
          translateY.setValue(Math.max(0, gestureState.dy));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 90 || gestureState.vy > 0.9) {
            onClose();
            return;
          }

          RNAnimated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        },
        onPanResponderTerminate: () => {
          RNAnimated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        },
      }),
    [onClose, translateY],
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} className="flex-1 justify-end bg-black/30">
        <Pressable className="flex-1" onPress={onClose} />

        <RNAnimated.View style={{ transform: [{ translateY }] }}>
          <Animated.View
            entering={SlideInDown.duration(220)}
            exiting={SlideOutDown.duration(180)}
            className="max-h-[88%] rounded-t-3xl border border-surface-border bg-surface-card px-5 pt-4"
            style={{ paddingBottom: footer ? 0 : safeBottom }}
          >
            <View className="mb-2 flex-row items-center justify-between">
              <View className="flex-1 items-center py-1" {...panResponder.panHandlers}>
                <View className="h-1.5 w-12 rounded-full bg-slate-300" />
              </View>

              <Pressable
                onPress={onClose}
                className="ml-3 h-8 w-8 items-center justify-center rounded-full border border-surface-border bg-surface-background"
                style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
              >
                <Ionicons name="close" size={18} color="#475569" />
              </Pressable>
            </View>

            {title ? <AppText className="mb-4 text-lg font-semibold text-content-primary">{title}</AppText> : null}
            {children}
            {footer ? (
              <View
                className="border-t border-surface-border bg-surface-card"
                style={{ paddingTop: footerTopPadding, paddingBottom: footerBottomPadding }}
              >
                {footer}
              </View>
            ) : null}
          </Animated.View>
        </RNAnimated.View>
      </Animated.View>
    </Modal>
  );
}
