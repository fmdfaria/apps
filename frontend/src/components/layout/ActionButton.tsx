import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getModuleTheme } from '@/types/theme';

interface ActionButtonProps {
  variant: 'view' | 'edit' | 'delete' | 'warning' | 'success' | 'primary';
  module: string; // Nome do módulo para aplicar o tema correto
  onClick: () => void;
  title?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Botões de ação padronizados com a estilização da página Agendamentos
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  variant,
  module,
  onClick,
  title,
  className,
  children
}) => {
  const theme = getModuleTheme(module);
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'view':
        return {
          className: `bg-gradient-to-r ${theme.primaryButton} text-white ${theme.primaryButtonHover} focus:ring-4 ${theme.focusRing}`,
          size: "sm" as const
        };
      case 'edit':
        return {
          className: "group border-2 border-green-300 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600 focus:ring-4 focus:ring-green-300",
          size: "sm" as const
        };
      case 'delete':
        return {
          className: "group border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-4 focus:ring-red-300",
          size: "sm" as const
        };
      case 'warning':
        return {
          className: "group border-2 border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white hover:border-orange-600 focus:ring-4 focus:ring-orange-300",
          size: "sm" as const
        };
      case 'success':
        return {
          className: "group border-2 border-green-300 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600 focus:ring-4 focus:ring-green-300",
          size: "sm" as const
        };
      case 'primary':
        return {
          className: `bg-gradient-to-r ${theme.primaryButton} text-white ${theme.primaryButtonHover} focus:ring-4 ${theme.focusRing}`,
          size: "sm" as const
        };
    }
  };

  const { className: variantClassName, size } = getVariantStyles();

  return (
    <Button
      variant={variant === 'view' ? 'default' : 'outline'}
      size={size}
      onClick={onClick}
      title={title}
      className={cn(
        variantClassName,
        "h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform",
        className
      )}
    >
      {children}
    </Button>
  );
};