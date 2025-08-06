import React from 'react';
import { CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ResponsiveCardFooterProps {
  children: React.ReactNode;
  className?: string;
  maxButtonsPerRow?: number; // Número máximo de botões por linha (padrão: 3)
  forceIconOnly?: boolean; // Forçar apenas ícones mesmo com poucos botões
  spacing?: 'tight' | 'normal' | 'loose'; // Espaçamento entre botões
}

/**
 * CardFooter responsivo que quebra botões em múltiplas linhas quando necessário
 * Adapta-se automaticamente ao número de botões e espaço disponível
 * 
 * Comportamento:
 * - 1-3 botões: Uma linha horizontal centralizada
 * - 4-6 botões: Flex wrap com quebra automática
 * - 7+ botões: Grid com 3 colunas
 */
export const ResponsiveCardFooter: React.FC<ResponsiveCardFooterProps> = ({
  children,
  className,
  maxButtonsPerRow = 3,
  forceIconOnly = false,
  spacing = 'normal'
}) => {
  const childrenArray = React.Children.toArray(children);
  const buttonCount = childrenArray.length;
  
  // Determinar espaçamento
  const getSpacing = () => {
    switch (spacing) {
      case 'tight': return 'gap-1';
      case 'loose': return 'gap-3';
      default: return 'gap-2';
    }
  };

  // Determinar a configuração de layout baseado no número de botões
  const getLayoutConfig = () => {
    const spacingClass = getSpacing();
    
    if (buttonCount <= maxButtonsPerRow) {
      // Até 3 botões: uma linha horizontal
      return {
        containerClass: `flex items-center justify-center ${spacingClass} w-full`,
        buttonClass: "flex-shrink-0",
        buttonSize: forceIconOnly ? "h-8 w-8 p-0" : "h-8 w-8 p-0"
      };
    } else if (buttonCount <= maxButtonsPerRow * 2) {
      // Até 6 botões: flex wrap que quebra automaticamente
      return {
        containerClass: `flex flex-wrap items-center justify-center ${spacingClass} w-full`,
        buttonClass: "flex-shrink-0",
        buttonSize: "h-8 w-8 p-0"
      };
    } else {
      // Mais de 6 botões: grid com colunas responsivas
      const cols = Math.min(buttonCount, maxButtonsPerRow);
      return {
        containerClass: `grid grid-cols-${cols} ${spacingClass} w-full`,
        buttonClass: "",
        buttonSize: "h-8 w-full p-1 text-xs" // Botões com texto quando muitos
      };
    }
  };

  const { containerClass, buttonClass, buttonSize } = getLayoutConfig();

  return (
    <CardFooter className={cn("pt-0 px-3 pb-3", className)}>
      <div className={containerClass}>
        {childrenArray.map((child, index) => (
          <div key={index} className={buttonClass}>
            {React.isValidElement(child) 
              ? React.cloneElement(child as React.ReactElement, {
                  className: cn(
                    child.props.className,
                    buttonSize,
                    // Garantir transições suaves
                    "transition-all duration-200 hover:scale-105"
                  )
                })
              : child
            }
          </div>
        ))}
      </div>
    </CardFooter>
  );
};