import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getModuleTheme } from '@/types/theme';

interface ResponsivePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  module: string; // Nome do módulo para aplicar o tema correto
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  className?: string;
}

/**
 * Componente de paginação responsiva
 */
export const ResponsivePagination: React.FC<ResponsivePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  module,
  onPageChange,
  onItemsPerPageChange,
  className
}) => {
  const theme = getModuleTheme(module);
  
  // Sempre renderiza quando há dados para manter layout sticky consistente
  // Controles são desabilitados quando totalPages === 1
  if (totalItems === 0) {
    return null;
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const generatePageNumbers = () => {
    // Mostra sempre 3 páginas quando possível
    const pages = [];
    
    if (totalPages <= 3) {
      // Se tem 3 ou menos páginas, mostra todas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (currentPage === 1) {
      // Primeira página: mostra atual + 2 para frente
      pages.push(1, 2, 3);
    } else if (currentPage === totalPages) {
      // Última página: mostra 2 para trás + atual
      pages.push(totalPages - 2, totalPages - 1, totalPages);
    } else {
      // Páginas intermediárias: 1 antes + atual + 1 depois
      pages.push(currentPage - 1, currentPage, currentPage + 1);
    }
    
    return pages;
  };

  return (
    <div className={cn(
      "sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200",
      "hidden xl:flex flex-col md:flex-row items-center justify-between gap-4 py-3 px-3 z-30 shadow-lg flex-shrink-0",
      className
    )}>
      {/* Items per page selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 flex items-center gap-2">
          <span className="text-lg">📊</span>
          Exibir
        </span>
        <select
          className={`border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 ${theme.focusRing} focus:border-rose-500 transition-all duration-200 hover:border-rose-300`}
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
        >
          {[10, 25, 50, 100].map(qtd => (
            <option key={qtd} value={qtd}>{qtd}</option>
          ))}
        </select>
        <span className="text-sm text-gray-600">itens por página</span>
      </div>
      
      {/* Items count */}
      <div className="text-sm text-gray-600 flex items-center gap-2">
        <span className="text-lg">📈</span>
        {startItem} a {endItem} de {totalItems} resultados
      </div>

      {/* Pagination controls */}
      <div className="flex gap-2">
        {/* Previous button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || totalPages === 1}
          className={(currentPage === 1 || totalPages === 1)
            ? `!border-2 !border-gray-200 !text-gray-400 !bg-gray-50 cursor-not-allowed font-medium !shadow-none !hover:bg-gray-50` 
            : `!border-2 !border-gray-200 !text-gray-700 !bg-white hover:!bg-gradient-to-r ${theme.hoverBg} ${theme.hoverTextColor} hover:!shadow-lg hover:!scale-110 !transition-all !duration-300 transform font-medium focus:!ring-2 ${theme.focusRing} focus:!ring-offset-2`
          }
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>

        {/* Page numbers */}
        {generatePageNumbers().map(pageNumber => (
          <Button
            key={pageNumber}
            variant="ghost"
            size="sm"
            onClick={() => totalPages > 1 ? onPageChange(pageNumber) : undefined}
            disabled={totalPages === 1}
            className={pageNumber === currentPage 
              ? `!bg-gradient-to-r ${theme.primaryButton} !text-white !shadow-lg font-semibold !border-0` 
              : totalPages === 1
              ? `!border-2 !border-gray-200 !text-gray-400 !bg-gray-50 cursor-not-allowed font-medium !shadow-none !hover:bg-gray-50`
              : `!border-2 !border-gray-200 !text-gray-700 !bg-white hover:!bg-gradient-to-r ${theme.hoverBg} ${theme.hoverTextColor} hover:!shadow-lg hover:!scale-110 !transition-all !duration-300 transform font-medium focus:!ring-2 ${theme.focusRing} focus:!ring-offset-2`
            }
          >
            {pageNumber}
          </Button>
        ))}

        {/* Next button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 1}
          className={(currentPage === totalPages || totalPages === 1)
            ? `!border-2 !border-gray-200 !text-gray-400 !bg-gray-50 cursor-not-allowed font-medium !shadow-none !hover:bg-gray-50` 
            : `!border-2 !border-gray-200 !text-gray-700 !bg-white hover:!bg-gradient-to-r ${theme.hoverBg} ${theme.hoverTextColor} hover:!shadow-lg hover:!scale-110 !transition-all !duration-300 transform font-medium focus:!ring-2 ${theme.focusRing} focus:!ring-offset-2`
          }
        >
          <span className="hidden sm:inline">Próximo</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};