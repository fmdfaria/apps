import React from 'react';
import { cn } from '@/lib/utils';

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container de conteúdo responsivo que preenche o espaço restante
 */
export const PageContent: React.FC<PageContentProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn(
      "flex-1 w-full overflow-hidden flex flex-col",
      className
    )}>
      {children}
    </div>
  );
};