import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/app-text';
import { motion } from '@/theme';

type ToastPayload = {
  message: string;
};

type ToastContextValue = {
  showToast: (payload: ToastPayload) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showToast = useCallback((payload: ToastPayload) => {
    setMessage(payload.message);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => setMessage(null), 1800);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Modal visible={Boolean(message)} transparent animationType="none" statusBarTranslucent>
        <View className="flex-1 justify-start px-5" style={{ paddingTop: Math.max(insets.top + 12, 20) }} pointerEvents="none">
          {message ? (
            <Animated.View entering={FadeInUp.duration(motion.quick)} exiting={FadeOutUp.duration(motion.quick)}>
              <View className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <AppText className="text-sm font-semibold text-emerald-700">{message}</AppText>
              </View>
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);

  if (!ctx) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  return ctx;
}
