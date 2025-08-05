import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveCardsProps<T> {
  data: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
  emptyIcon?: string;
}

/**
 * Grid responsivo de cards que se adapta a diferentes tamanhos de tela
 */
export const ResponsiveCards = <T extends Record<string, any>>({
  data,
  renderCard,
  className,
  emptyMessage = "Nenhum resultado encontrado",
  emptyIcon = "📄"
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
    <div className="flex-1 overflow-y-auto px-3">
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
    </div>
  );
};