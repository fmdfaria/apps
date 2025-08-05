import { useState, useMemo } from 'react';

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface SimpleFilterConfig {
  [key: string]: string;
}

export interface PaginationConfig {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

/**
 * Hook para gerenciar funcionalidades de tabela responsiva
 */
export const useResponsiveTable = <T extends Record<string, any>>(
  data: T[],
  initialItemsPerPage: number = 10
) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filterConfig, setFilterConfig] = useState<SimpleFilterConfig>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Dados ordenados
  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [data, sortConfig]);

  // Dados filtrados
  const filteredData = useMemo(() => {
    return sortedData.filter(item => {
      return Object.entries(filterConfig).every(([key, value]) => {
        if (!value) return true;
        const itemValue = item[key];
        if (itemValue == null) return false;
        return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
      });
    });
  }, [sortedData, filterConfig]);

  // Dados paginados
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Total de páginas
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Função para ordenar
  const handleSort = (key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig?.key === key) {
        if (prevConfig.direction === 'asc') {
          return { key, direction: 'desc' };
        } else {
          return null; // Remove ordenação
        }
      } else {
        return { key, direction: 'asc' };
      }
    });
  };

  // Função para filtrar
  const handleFilter = (key: string, value: string) => {
    setFilterConfig(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset para primeira página
  };

  // Função para limpar filtros
  const clearFilters = () => {
    setFilterConfig({});
    setCurrentPage(1);
  };

  // Função para mudar página
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Função para mudar itens por página
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset para primeira página
  };

  return {
    // Dados processados
    data: paginatedData,
    allData: filteredData,
    
    // Configurações
    sortConfig,
    filterConfig,
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems: filteredData.length,
    
    // Handlers
    setSortConfig,
    setFilterConfig,
    handleSort,
    handleFilter,
    clearFilters,
    handlePageChange,
    handleItemsPerPageChange,
    setCurrentPage,
    setItemsPerPage
  };
};