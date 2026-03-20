const primitives = require('./src/theme/primitives.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: primitives.brandScale,
        surface: {
          background: primitives.colors.background,
          card: primitives.colors.surface,
          border: primitives.colors.border,
        },
        content: {
          primary: primitives.colors.text,
          secondary: primitives.colors.textSecondary,
          muted: primitives.colors.textMuted,
          inverse: primitives.colors.textInverse,
          danger: primitives.colors.danger,
        },
      },
      borderRadius: {
        lg: `${primitives.radius.md}px`,
        xl: `${primitives.radius.lg}px`,
        '2xl': `${primitives.radius.xxl}px`,
      },
      boxShadow: {
        card: '0 8px 24px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
