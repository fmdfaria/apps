import primitives from '@/theme/primitives.json';

export const tokens = {
  colors: {
    ...primitives.colors,
  },
  spacing: {
    ...primitives.spacing,
  },
  radius: {
    sm: primitives.radius.sm,
    md: primitives.radius.md,
    lg: primitives.radius.lg,
    xl: primitives.radius.xl,
  },
  size: {
    ...primitives.size,
  },
  opacity: {
    disabled: 0.45,
    pressed: 0.9,
  },
  shadow: {
    card: {
      shadowColor: primitives.colors.text,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 3,
    },
    elevated: {
      shadowColor: primitives.colors.text,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 5,
    },
  },
  typography: {
    display: 'text-4xl font-bold tracking-tight',
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-2xl font-semibold tracking-tight',
    h3: 'text-xl font-semibold',
    body: 'text-base',
    caption: 'text-xs',
    label: 'text-sm font-semibold',
  },
} as const;

export type Tokens = typeof tokens;
