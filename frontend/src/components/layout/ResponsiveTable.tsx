import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getModuleTheme } from '@/types/theme';
import { InfiniteScrollLoader } from './InfiniteScrollLoader';

// Tipos de filtro disponíveis
export type FilterType = 'text' | 'number' | 'date' | 'select' | 'range' | 'currency' | 'percentage';

// Configuração específica para cada tipo de filtro
export interface FilterConfig {
  type: FilterType;
  placeholder?: string;
  options?: { value: string; label: string }[]; // Para tipo 'select'
  min?: number; // Para tipos numéricos
  max?: number; // Para tipos numéricos
  step?: number; // Para tipos numéricos
  currency?: string; // Para tipo 'currency' (default: 'BRL')
  label?: string; // Label personalizado (senão usa o header da coluna)
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  essential?: boolean; // Se deve aparecer na versão tablet
  className?: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  // Propriedades para filtros dinâmicos
  filterable?: boolean | FilterConfig;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  module: string; // Nome do módulo para aplicar o tema correto
  className?: string;
  emptyMessage?: string;
  // Props para infinite scroll
  isLoadingMore?: boolean;
  hasNextPage?: boolean;
  isMobile?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement>; // Ref para scroll infinito
}

/**
 * Tabela responsiva que se adapta a diferentes tamanhos de tela
 */
export const ResponsiveTable = <T extends Record<string, any>>({
  data,
  columns,
  module,
  className,
  emptyMessage = "Nenhum resultado encontrado",
  isLoadingMore = false,
  hasNextPage = false,
  isMobile = false,
  scrollRef
}: ResponsiveTableProps<T>) => {
  const theme = getModuleTheme(module);
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-3xl">📄</span>
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
        "flex-1 flex flex-col overflow-hidden mx-3 rounded-lg bg-white shadow-sm border border-gray-100",
        // Para mobile/tablet, permitir scroll no container principal
        isMobile ? "overflow-y-auto" : ""
      )}
    >
      {/* Desktop: Tabela completa responsiva */}
      <div className="hidden lg:flex lg:flex-col lg:flex-1 lg:overflow-hidden">
        <Table className={cn("w-full table-auto", className)}>
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow className={`bg-gradient-to-r ${theme.headerBg} border-b border-gray-200`}>
              {columns.map((column) => (
                <TableHead 
                  key={String(column.key)} 
                  className={cn("py-3 text-sm font-semibold text-gray-700 px-4 whitespace-nowrap", column.className)}
                  style={{ minWidth: '120px' }}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="overflow-y-auto">
            {data.map((item, index) => (
              <TableRow key={index} className={`hover:bg-gradient-to-r ${theme.hoverBg} transition-all duration-200 h-12`}>
                {columns.map((column) => (
                  <TableCell 
                    key={String(column.key)} 
                    className={cn("py-2 px-4 border-b border-gray-100", column.className)}
                  >
                    {column.render ? column.render(item) : String(item[column.key] || '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Tablet: Tabela compacta */}
      <div className="hidden md:flex md:flex-col md:flex-1 md:overflow-hidden lg:hidden">
        <Table className={cn("w-full table-auto", className)}>
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow className={`bg-gradient-to-r ${theme.headerBg} border-b border-gray-200`}>
              {columns.filter(col => col.essential).map((column) => (
                <TableHead 
                  key={String(column.key)} 
                  className={cn("py-3 text-sm font-semibold text-gray-700 px-4 whitespace-nowrap", column.className)}
                  style={{ minWidth: '120px' }}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="overflow-y-auto">
            {data.map((item, index) => (
              <TableRow key={index} className={`hover:bg-gradient-to-r ${theme.hoverBg} transition-all duration-200 h-12`}>
                {columns.filter(col => col.essential).map((column) => (
                  <TableCell 
                    key={String(column.key)} 
                    className={cn("py-2 px-4 border-b border-gray-100", column.className)}
                  >
                    {column.render ? column.render(item) : String(item[column.key] || '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: Cards inline */}
      <div className="block md:hidden">
        <div className="space-y-4">
          {data.map((item, index) => (
            <Card key={index} className="p-4 hover:shadow-md transition-shadow">
              <div className="space-y-2">
                {columns.map((column) => (
                  <div key={String(column.key)} className="flex justify-between">
                    <span className="font-medium text-sm text-muted-foreground">
                      {column.header}:
                    </span>
                    <span className="text-sm">
                      {column.render ? column.render(item) : String(item[column.key] || '')}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
        
        {/* Loader para infinite scroll no mobile */}
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