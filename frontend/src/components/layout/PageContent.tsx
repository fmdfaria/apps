import React from 'react';
import { cn } from '@/lib/utils';

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
  scrollRef?: React.RefObject<HTMLDivElement>; // Ref para infinite scroll
}

/**
 * Container de conteúdo responsivo que preenche o espaço restante
 * Suporta ref para infinite scroll em telas pequenas/médias
 */
export const PageContent: React.FC<PageContentProps> = ({ 
  children, 
  className,
  scrollRef
}) => {
  return (
    <div 
      ref={scrollRef}
      className={cn(
        "flex-1 w-full overflow-hidden flex flex-col",
        // Para infinite scroll, precisa permitir rolagem em telas pequenas
        "xl:overflow-hidden overflow-y-auto",
        className
      )}
    >
      {children}
    </div>
  );
};