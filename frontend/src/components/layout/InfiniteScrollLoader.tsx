import React from 'react';
import { cn } from '@/lib/utils';

interface InfiniteScrollLoaderProps {
  isLoading: boolean;
  hasNextPage: boolean;
  className?: string;
  loadingText?: string;
  endText?: string;
}

/**
 * Componente que mostra indicador de carregamento ou fim dos dados
 * para infinite scroll
 */
export const InfiniteScrollLoader: React.FC<InfiniteScrollLoaderProps> = ({
  isLoading,
  hasNextPage,
  className,
  loadingText = "Carregando mais itens...",
  endText = "Todos os itens foram carregados"
}) => {
  if (!isLoading && hasNextPage) {
    return null; // Não mostra nada se não está carregando e tem mais páginas
  }

  return (
    <div className={cn(
      "flex items-center justify-center py-6 px-3",
      "xl:hidden", // Só mostra em telas pequenas/médias
      className
    )}>
      {isLoading ? (
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">{loadingText}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-gray-500">
          <span className="text-lg">🎉</span>
          <span className="text-sm">{endText}</span>
        </div>
      )}
    </div>
  );
};