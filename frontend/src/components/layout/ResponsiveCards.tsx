import React from 'react';
import { cn } from '@/lib/utils';
import { InfiniteScrollLoader } from './InfiniteScrollLoader';

interface ResponsiveCardsProps<T> {
  data: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
  emptyIcon?: string;
  // Props para infinite scroll
  isLoadingMore?: boolean;
  hasNextPage?: boolean;
  isMobile?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement>; // Ref para scroll infinito
}

/**
 * Grid responsivo de cards que se adapta a diferentes tamanhos de tela
 */
export const ResponsiveCards = <T extends Record<string, any>>({
  data,
  renderCard,
  className,
  emptyMessage = "Nenhum resultado encontrado",
  emptyIcon = "📄",
  isLoadingMore = false,
  hasNextPage = false,
  isMobile = false,
  scrollRef
}: ResponsiveCardsProps<T>) => {
  if (data.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-3xl">{emptyIcon}</span>
        </div>
        <h3 className="text-lg font-medium mb-2">
          {emptyMessage}
        </h3>
        <p className="text-sm">
          Tente alterar os filtros de busca.
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={isMobile ? scrollRef : undefined}
      className={cn(
        "flex-1 flex flex-col overflow-hidden px-3",
        // Para mobile/tablet, permitir scroll no container principal
        isMobile ? "overflow-y-auto" : ""
      )}
    >
      <div className="flex-1 overflow-y-auto">
        <div className={cn(
          "grid gap-4 w-full py-3",
          "grid-cols-1",           // Mobile: 1 coluna
          "sm:grid-cols-2",        // Mobile grande: 2 colunas
          "md:grid-cols-3",        // Tablet: 3 colunas
          "lg:grid-cols-4",        // Desktop: 4 colunas
          "xl:grid-cols-5",        // Desktop grande: 5 colunas
          "2xl:grid-cols-6",       // Monitor grande: 6 colunas
          className
        )}>
          {data.map((item, index) => (
            <div key={index} className="h-full">
              {renderCard(item, index)}
            </div>
          ))}
        </div>
        
        {/* Loader para infinite scroll */}
        {isMobile && (
          <InfiniteScrollLoader
            isLoading={isLoadingMore}
            hasNextPage={hasNextPage}
          />
        )}
      </div>
    </div>
  );
};