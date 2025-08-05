import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getModuleTheme } from '@/types/theme';

interface PageHeaderProps {
  title: string;
  module: string; // Nome do módulo para aplicar o tema correto
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Header responsivo padrão para todas as páginas
 * Mantém a estilização rica da página de Agendamentos
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  module,
  icon, 
  children, 
  className 
}) => {
  const theme = getModuleTheme(module);
  
  return (
    <div className={cn(
      "sticky top-0 z-20 bg-white backdrop-blur border-b border-gray-200 shadow-sm flex-shrink-0",
      className
    )}>
      {/* Mobile: Layout vertical empilhado */}
      <div className="block lg:hidden px-3 py-3 space-y-3">
        {/* Título */}
        <div className="flex items-center justify-center">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {icon && <span className="text-2xl">{icon}</span>}
            <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent`}>
              {title}
            </span>
          </h1>
        </div>
        
        {/* Controles - empilhados verticalmente */}
        {children && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            {children}
          </div>
        )}
      </div>

      {/* Desktop: Layout horizontal */}
      <div className="hidden lg:flex lg:justify-between lg:items-center px-3 py-3 gap-4">
        {/* Título */}
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {icon && <span className="text-3xl">{icon}</span>}
            <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent`}>
              {title}
            </span>
          </h1>
        </div>
        
        {/* Controles - horizontal */}
        {children && (
          <div className="flex items-center gap-4 flex-shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};