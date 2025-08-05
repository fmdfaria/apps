import { useState, useMemo, useCallback } from 'react';
import { 
  ActiveFilters, 
  ExtractedFilterConfig, 
  FilterValue, 
  TableFiltersResult, 
  FilterConfig,
  DEFAULT_FILTER_CONFIGS 
} from '@/types/filters';
import { TableColumn } from '@/components/layout/ResponsiveTable';

/**
 * Hook para gerenciar filtros dinâmicos baseados nas colunas da tabela
 */
export const useTableFilters = <T extends Record<string, any>>(
  columns: TableColumn<T>[]
): TableFiltersResult => {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  // Extrair configurações de filtro das colunas
  const filterConfigs = useMemo((): ExtractedFilterConfig[] => {
    return columns
      .filter(column => column.filterable)
      .map(column => {
        const key = String(column.key);
        let config: FilterConfig;

        if (typeof column.filterable === 'boolean') {
          // Se filterable é true, usar configuração padrão baseada no key
          const defaultConfig = DEFAULT_FILTER_CONFIGS[key];
          if (defaultConfig) {
            config = { ...defaultConfig } as FilterConfig;
          } else {
            // Fallback para tipo text
            config = { type: 'text', placeholder: `Buscar ${column.header.toLowerCase()}...` };
          }
        } else {
          // Usar configuração personalizada
          config = column.filterable;
        }

        return {
          key,
          config,
          header: column.header
        };
      });
  }, [columns]);

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    return Object.values(activeFilters).filter(filterValue => {
      if (!filterValue) return false;
      
      // Verificar se o filtro tem algum valor não-vazio
      if (filterValue.text && filterValue.text.trim() !== '') return true;
      if (filterValue.number !== undefined && filterValue.number !== null) return true;
      if (filterValue.date && filterValue.date !== '') return true;
      if (filterValue.select && filterValue.select !== '') return true;
      if (filterValue.range) {
        const { min, max } = filterValue.range;
        if ((min !== undefined && min !== null && String(min) !== '') || 
            (max !== undefined && max !== null && String(max) !== '')) {
          return true;
        }
      }
      
      return false;
    }).length;
  }, [activeFilters]);

  // Definir valor de um filtro
  const setFilter = useCallback((columnKey: string, value: FilterValue) => {
    setActiveFilters(prev => ({
      ...prev,
      [columnKey]: value
    }));
  }, []);

  // Limpar um filtro específico
  const clearFilter = useCallback((columnKey: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[columnKey];
      return newFilters;
    });
  }, []);

  // Limpar todos os filtros
  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  // Função para aplicar filtros aos dados
  const applyFilters = useCallback(<TData extends Record<string, any>>(data: TData[]): TData[] => {
    if (activeFiltersCount === 0) return data;

    return data.filter(item => {
      return Object.entries(activeFilters).every(([columnKey, filterValue]) => {
        if (!filterValue) return true;

        // Suporte para campos aninhados (ex: "convenio.nome")
        let itemValue = item[columnKey];
        if (columnKey === 'convenio' && item.convenio && typeof item.convenio === 'object') {
          itemValue = item.convenio.nome;
        }
        
        const filterConfig = filterConfigs.find(fc => fc.key === columnKey)?.config;
        
        if (!filterConfig) return true;

        // Aplicar filtro baseado no tipo
        switch (filterConfig.type) {
          case 'text': {
            if (!filterValue.text || filterValue.text.trim() === '') return true;
            if (itemValue == null) return false;
            return String(itemValue).toLowerCase().includes(filterValue.text.toLowerCase());
          }

          case 'number': {
            if (filterValue.number === undefined || filterValue.number === null) return true;
            if (itemValue == null) return false;
            return Number(itemValue) === Number(filterValue.number);
          }

          case 'select': {
            if (!filterValue.select || filterValue.select === '') return true;
            if (itemValue == null) return false;
            return String(itemValue) === filterValue.select;
          }

          case 'date': {
            if (!filterValue.date || filterValue.date === '') return true;
            if (itemValue == null) return false;
            // Comparar apenas a parte da data (YYYY-MM-DD)
            const itemDate = new Date(itemValue).toISOString().split('T')[0];
            return itemDate === filterValue.date;
          }

          case 'range':
          case 'currency':
          case 'percentage': {
            if (!filterValue.range) return true;
            const { min, max } = filterValue.range;
            
            if (itemValue == null) return false;
            let numericValue = Number(itemValue);
            
            // Para campos de moeda, lidar com formatação
            if (filterConfig.type === 'currency' && typeof itemValue === 'string') {
              numericValue = Number(itemValue.replace(/[^\d,.-]/g, '').replace(',', '.'));
            }
            
            if (isNaN(numericValue)) return false;
            
            // Verificar range
            let passesMin = true;
            let passesMax = true;
            
            if (min !== undefined && min !== null && String(min) !== '') {
              const minValue = filterConfig.type === 'currency' && typeof min === 'string' 
                ? Number(min.replace(/[^\d,.-]/g, '').replace(',', '.'))
                : Number(min);
              passesMin = numericValue >= minValue;
            }
            
            if (max !== undefined && max !== null && String(max) !== '') {
              const maxValue = filterConfig.type === 'currency' && typeof max === 'string'
                ? Number(max.replace(/[^\d,.-]/g, '').replace(',', '.'))
                : Number(max);
              passesMax = numericValue <= maxValue;
            }
            
            return passesMin && passesMax;
          }

          default:
            return true;
        }
      });
    });
  }, [activeFilters, activeFiltersCount, filterConfigs]);

  return {
    activeFilters,
    filterConfigs,
    activeFiltersCount,
    setFilter,
    clearFilter,
    clearAllFilters,
    applyFilters
  };
};