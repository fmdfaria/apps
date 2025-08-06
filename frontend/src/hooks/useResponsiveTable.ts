import { useState, useMemo, useCallback } from 'react';
import { useBreakpoint, useInfiniteScroll } from './useInfiniteScroll';

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
 * Suporta paginação tradicional (desktop) e rolagem infinita (mobile/tablet)
 */
export const useResponsiveTable = <T extends Record<string, any>>(
  data: T[],
  initialItemsPerPage: number = 10
) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filterConfig, setFilterConfig] = useState<SimpleFilterConfig>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  
  // Estados para infinite scroll
  const [loadedItemsCount, setLoadedItemsCount] = useState(initialItemsPerPage);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Detecta o breakpoint atual
  const { isDesktop, isMobile } = useBreakpoint();

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

  // Dados para exibição - depende do modo (desktop = paginado, mobile = infinito)
  const displayData = useMemo(() => {
    if (isDesktop) {
      // Desktop: paginação tradicional
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredData.slice(startIndex, startIndex + itemsPerPage);
    } else {
      // Mobile/Tablet: rolagem infinita - mostra até loadedItemsCount itens
      return filteredData.slice(0, loadedItemsCount);
    }
  }, [filteredData, currentPage, itemsPerPage, loadedItemsCount, isDesktop]);

  // Total de páginas (só usado no desktop)
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  
  // Verifica se há mais itens para carregar (infinite scroll)
  const hasNextPage = useMemo(() => {
    if (isDesktop) {
      return currentPage < totalPages;
    } else {
      return loadedItemsCount < filteredData.length;
    }
  }, [isDesktop, currentPage, totalPages, loadedItemsCount, filteredData.length]);

  // Função para carregar mais itens (infinite scroll)
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasNextPage || isDesktop) return;
    
    setIsLoadingMore(true);
    
    // Simula um pequeno delay para UX
    setTimeout(() => {
      setLoadedItemsCount(prev => Math.min(prev + itemsPerPage, filteredData.length));
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, hasNextPage, isDesktop, itemsPerPage, filteredData.length]);

  // Hook de infinite scroll (só ativo em mobile/tablet)
  const { targetRef } = useInfiniteScroll(
    loadMore,
    hasNextPage,
    isLoadingMore,
    { enabled: isMobile }
  );

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
    setLoadedItemsCount(initialItemsPerPage); // Reset infinite scroll
  };

  // Função para limpar filtros
  const clearFilters = () => {
    setFilterConfig({});
    setCurrentPage(1);
    setLoadedItemsCount(initialItemsPerPage); // Reset infinite scroll
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
    data: displayData,
    allData: filteredData,
    
    // Configurações
    sortConfig,
    filterConfig,
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems: filteredData.length,
    
    // Infinite scroll específico
    isDesktop,
    isMobile,
    hasNextPage,
    isLoadingMore,
    loadedItemsCount,
    targetRef, // Ref para o container de scroll
    
    // Handlers
    setSortConfig,
    setFilterConfig,
    handleSort,
    handleFilter,
    clearFilters,
    handlePageChange,
    handleItemsPerPageChange,
    setCurrentPage,
    setItemsPerPage,
    loadMore
  };
};