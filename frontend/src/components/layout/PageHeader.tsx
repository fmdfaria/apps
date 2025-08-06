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
 * Layouts adaptativos para diferentes breakpoints:
 * - sm/md: 2 linhas (Título+Busca | Filtros+Toggles+Botão)
 * - lg: 1 linha compacta (Título+Busca+Filtros+Toggles+Botão - ícones apenas)
 * - xl/2xl: Layout completo atual
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  module,
  icon, 
  children, 
  className 
}) => {
  const theme = getModuleTheme(module);
  
  // Função helper para clonar children com props específicas do breakpoint
  const cloneChildrenWithProps = (iconOnly: boolean = false) => {
    return React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        // Detectar tipo de componente pelos props ou displayName
        const childProps: any = {};
        
        // Se é SearchBar, manter como está em sm/md, compactar em lg
        if (child.props.placeholder) {
          if (iconOnly) {
            // Para lg: SearchBar mais compacta
            childProps.className = "w-32 max-w-32";
          }
        }
        
        // Se é FilterButton ou ViewToggle, aplicar iconOnly
        if (iconOnly && (child.props.onToggleFilters || child.props.onViewModeChange)) {
          childProps.iconOnly = true;
        }
        
        // Se é Button com ícone (botão de ação), aplicar transformação sem iconOnly prop
        if (iconOnly && child.type === Button && child.props.children) {
          const childrenArray = React.Children.toArray(child.props.children);
          
          // Verificar se tem ícone Lucide como children
          const iconChild = childrenArray.find((buttonChild: any) => 
            React.isValidElement(buttonChild) && 
            (buttonChild.props?.className?.includes('w-4 h-4') || buttonChild.props?.className?.includes('lucide'))
          );
          
          // Extrair texto para título
          const textContent = childrenArray.find((c: any) => typeof c === 'string');
          
          if (iconChild) {
            childProps.children = iconChild;
            childProps.className = (child.props.className || '') + " !w-10 !px-0";
            childProps.title = textContent || "Ação";
          }
        }
        
        return React.cloneElement(child, childProps);
      }
      return child;
    });
  };
  
  return (
    <div className={cn(
      "sticky top-0 z-20 bg-white backdrop-blur border-b border-gray-200 shadow-sm flex-shrink-0",
      className
    )}>
      {/* sm/md: Layout 2 linhas */}
      <div className="block lg:hidden px-3 py-3 space-y-3">
        {/* Linha 1: Título + Busca centralizada */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex-shrink-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              {icon && <span className="text-xl sm:text-2xl">{icon}</span>}
              <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent`}>
                {title}
              </span>
            </h1>
          </div>
          
          {/* Busca na linha 1 para sm/md */}
          {children && (
            <div className="flex-1 max-w-xs">
              {React.Children.toArray(children).find((child: any) => 
                React.isValidElement(child) && child.props.placeholder
              )}
            </div>
          )}
        </div>
        
        {/* Linha 2: Filtros + Toggles + Botão (apenas ícones) centralizada */}
        {children && (
          <div className="flex items-center justify-center gap-2">
            {cloneChildrenWithProps(true)
              .filter((child: any) => 
                React.isValidElement(child) && !child.props?.placeholder
              )
              .map((child, index) => (
                <div key={index}>
                  {child}
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* lg: Layout 1 linha compacta */}
      <div className="hidden lg:block xl:hidden px-3 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Título + Busca à esquerda */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {icon && <span className="text-xl">{icon}</span>}
                <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent`}>
                  {title}
                </span>
              </h1>
            </div>
            
            {/* Busca na mesma linha do título */}
            {children && (
              <div>
                {React.Children.toArray(children).find((child: any) => 
                  React.isValidElement(child) && child.props.placeholder
                ) && React.cloneElement(
                  React.Children.toArray(children).find((child: any) => 
                    React.isValidElement(child) && child.props.placeholder
                  ) as React.ReactElement,
                  { className: "w-40 max-w-40" }
                )}
              </div>
            )}
          </div>
          
          {/* Controles à direita (sem busca, apenas ícones) */}
          {children && (
            <div className="flex items-center gap-2">
              {cloneChildrenWithProps(true)
                .filter((child: any) => 
                  React.isValidElement(child) && !child.props?.placeholder
                )
                .map((child, index) => (
                  <div key={index}>
                    {child}
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* xl/2xl: Layout completo original */}
      <div className="hidden xl:flex xl:justify-between xl:items-center px-3 py-3 gap-4">
        {/* Título */}
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {icon && <span className="text-3xl">{icon}</span>}
            <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent`}>
              {title}
            </span>
          </h1>
        </div>
        
        {/* Controles completos */}
        {children && (
          <div className="flex items-center gap-4 flex-shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};