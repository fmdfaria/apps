import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
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
      {message ? (
        <Animated.View
          entering={FadeInUp.duration(motion.quick)}
          exiting={FadeOutUp.duration(motion.quick)}
          className="absolute bottom-8 left-5 right-5"
          pointerEvents="none"
        >
          <View className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <AppText className="text-sm font-semibold text-emerald-700">{message}</AppText>
          </View>
        </Animated.View>
      ) : null}
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
