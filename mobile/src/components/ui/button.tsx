import { cva, type VariantProps } from 'class-variance-authority';
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { cn } from '@/lib/cn';
import { tokens } from '@/theme';

const buttonVariants = cva('flex-row items-center justify-center rounded-xl px-5', {
  variants: {
    variant: {
      primary: 'bg-brand-700',
      secondary: 'bg-slate-200',
      ghost: 'bg-transparent',
    },
    size: {
      sm: 'h-11 px-4',
      md: 'h-[52px] px-5',
      lg: 'h-[60px] px-6',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

const textVariants = cva('font-semibold', {
  variants: {
    variant: {
      primary: 'text-content-inverse',
      secondary: 'text-content-primary',
      ghost: 'text-brand-700',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

type ButtonProps = Omit<PressableProps, 'style'> &
  VariantProps<typeof buttonVariants> & {
    label: string;
    className?: string;
    loading?: boolean;
    leftSlot?: ReactNode;
    rightSlot?: ReactNode;
    style?: StyleProp<ViewStyle>;
  };

export function Button({
  label,
  variant,
  size,
  className,
  loading,
  disabled,
  leftSlot,
  rightSlot,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      className={cn(
        buttonVariants({ variant, size }),
        className,
      )}
      style={({ pressed }) => [
        {
          opacity: isDisabled ? tokens.opacity.disabled : pressed ? tokens.opacity.pressed : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
      accessibilityRole="button"
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? tokens.colors.textInverse : tokens.colors.text} />
      ) : (
        <>
          {leftSlot}
          <AppText className={cn(textVariants({ variant, size }), leftSlot && 'ml-2', rightSlot && 'mr-2')}>{label}</AppText>
          {rightSlot}
        </>
      )}
    </Pressable>
  );
}
