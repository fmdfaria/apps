import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container principal responsivo que preenche toda a largura disponível
 */
export const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn(
      "w-full h-screen flex flex-col overflow-hidden",
      className
    )}>
      {children}
    </div>
  );
};