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
      "sticky top-0 z-20 bg-white backdrop-blur border-b border-gray-200 shadow-sm flex-shrink-0 px-6 py-4",
      className
    )}>
      {/* Layout responsivo: 3 linhas < 640px, 2 linhas 640-1023px, 1 linha >= 1024px */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        {/* Primeira linha: Título (mobile < 640) | Título + Busca (>= 640) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
          <div className="flex-shrink-0">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 lg:gap-3">
              {icon && <span className="text-3xl lg:text-4xl">{icon}</span>}
              <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent`}>
                {title}
              </span>
            </h1>
          </div>

          {/* Busca - segunda linha em mobile (< 640), primeira linha em sm+ */}
          {children && (
            <div className="w-full sm:flex-1 sm:max-w-md">
              {React.Children.toArray(children).find((child: any) =>
                React.isValidElement(child) && child.props.placeholder
              )}
            </div>
          )}
        </div>

        {/* Segunda linha: Controles */}
        {children && (
          <div className="flex items-center justify-center lg:justify-end gap-1.5 lg:gap-4 flex-wrap">
            {React.Children.toArray(children)
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
  );
};