import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { Filter, FilterX, X } from 'lucide-react';

// Interfaces TypeScript
export interface FilterField {
  key: string;
  type: 'text' | 'date' | 'select' | 'static-select' | 'api-select';
  label: string;
  placeholder?: string;
  options?: Array<{ id: string; nome: string }>; // Para static-select
  apiService?: () => Promise<any[]>; // Para api-select
  searchFields?: string[]; // Para SingleSelectDropdown
}

export interface AdvancedFilterProps {
  fields: FilterField[];
  filters: Record<string, string>;
  appliedFilters: Record<string, string>;
  onFilterChange: (field: string, value: string) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isVisible: boolean;
  onClose: () => void;
  loading?: boolean;
  className?: string;
}

export const AdvancedFilter: React.FC<AdvancedFilterProps> = ({
  fields,
  filters,
  appliedFilters,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  isVisible,
  onClose,
  loading = false,
  className = ''
}) => {
  // Estados para opções dos dropdowns carregados via API
  const [apiOptions, setApiOptions] = useState<Record<string, Array<{ id: string; nome: string }>>>({});
  const [loadingOptions, setLoadingOptions] = useState<Record<string, boolean>>({});

  // Carregar opções via API quando necessário
  useEffect(() => {
    const loadApiOptions = async () => {
      const apiFields = fields.filter(field => field.type === 'api-select' && field.apiService);
      
      if (apiFields.length === 0) return;

      const loadingState: Record<string, boolean> = {};
      apiFields.forEach(field => {
        loadingState[field.key] = true;
      });
      setLoadingOptions(loadingState);

      try {
        const promises = apiFields.map(async (field) => {
          if (!field.apiService) return { key: field.key, data: [] };
          const data = await field.apiService();
          return { key: field.key, data };
        });

        const results = await Promise.all(promises);
        const optionsData: Record<string, Array<{ id: string; nome: string }>> = {};
        
        results.forEach(({ key, data }) => {
          optionsData[key] = data;
        });

        setApiOptions(optionsData);
      } catch (error) {
        console.error('Erro ao carregar opções dos filtros:', error);
      } finally {
        const finalLoadingState: Record<string, boolean> = {};
        apiFields.forEach(field => {
          finalLoadingState[field.key] = false;
        });
        setLoadingOptions(finalLoadingState);
      }
    };

    if (isVisible) {
      loadApiOptions();
    }
  }, [fields, isVisible]);

  // Helper functions
  const hasActiveFilters = Object.values(appliedFilters).some(value => value !== '');
  const hasUnappliedChanges = JSON.stringify(filters) !== JSON.stringify(appliedFilters);

  const formatarDataBrasil = (dataISO: string) => {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Função para remover filtro individual
  const handleRemoveFilter = (fieldKey: string) => {
    onFilterChange(fieldKey, '');
    // Apenas limpa o filtro, não aplica automaticamente
    // O usuário deve clicar em "Aplicar Filtros" para executar a busca
  };

  // Renderizar campo baseado no tipo
  const renderField = (field: FilterField) => {
    const currentValue = filters[field.key] || '';
    
    switch (field.type) {
      case 'text':
        return (
          <Input
            type="text"
            placeholder={field.placeholder || `Filtrar por ${field.label.toLowerCase()}...`}
            value={currentValue}
            onChange={(e) => onFilterChange(field.key, e.target.value)}
            className="h-8"
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={currentValue}
            onChange={(e) => onFilterChange(field.key, e.target.value)}
            className="h-8"
          />
        );

      case 'static-select':
        const staticOptions = field.options || [];
        return (
          <SingleSelectDropdown
            options={staticOptions}
            selected={staticOptions.find(option => option.id === currentValue) || null}
            onChange={(selected) => onFilterChange(field.key, selected?.id || '')}
            placeholder={field.placeholder || `Selecione ${field.label.toLowerCase()}...`}
            searchFields={field.searchFields || ['nome']}
          />
        );

      case 'api-select':
        const apiOptionsList = apiOptions[field.key] || [];
        const isLoadingField = loadingOptions[field.key] || false;
        
        return (
          <SingleSelectDropdown
            options={apiOptionsList}
            selected={apiOptionsList.find(option => option.id === currentValue) || null}
            onChange={(selected) => onFilterChange(field.key, selected?.id || '')}
            placeholder={field.placeholder || `Selecione ${field.label.toLowerCase()}...`}
            searchFields={field.searchFields || ['nome']}
            disabled={isLoadingField}
          />
        );

      case 'select':
        // Alias para api-select para manter compatibilidade
        const selectOptions = apiOptions[field.key] || field.options || [];
        const isLoadingSelect = loadingOptions[field.key] || false;
        
        return (
          <SingleSelectDropdown
            options={selectOptions}
            selected={selectOptions.find(option => option.id === currentValue) || null}
            onChange={(selected) => onFilterChange(field.key, selected?.id || '')}
            placeholder={field.placeholder || `Selecione ${field.label.toLowerCase()}...`}
            searchFields={field.searchFields || ['nome']}
            disabled={isLoadingSelect}
          />
        );

      default:
        return null;
    }
  };

  // Função para obter valor formatado para display
  const getDisplayValue = (field: FilterField, value: string) => {
    if (!value) return '';

    switch (field.type) {
      case 'date':
        return formatarDataBrasil(value);
      
      case 'static-select':
        const staticOption = field.options?.find(opt => opt.id === value);
        return staticOption?.nome || value;
      
      case 'api-select':
      case 'select':
        const apiOption = apiOptions[field.key]?.find(opt => opt.id === value);
        if (apiOption) {
          // Tentar usar o primeiro campo de busca como display, ou 'nome' como fallback
          const displayField = field.searchFields?.[0] || 'nome';
          return (apiOption as any)[displayField] || apiOption.nome || value;
        }
        return value;
      
      default:
        return value;
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg px-6 py-4 mb-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filtros Avançados</h3>
        <div className="flex gap-2">
          {hasUnappliedChanges && (
            <Button
              variant="default"
              size="sm"
              onClick={onApplyFilters}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Filter className="w-4 h-4 mr-1" />
              Aplicar Filtros
            </Button>
          )}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              disabled={loading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <FilterX className="w-4 h-4 mr-1" />
              Limpar Filtros
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Grid de Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {fields.map(field => (
          <div key={field.key} className="space-y-2">
            <span className="text-sm font-medium text-gray-700">{field.label}</span>
            {renderField(field)}
          </div>
        ))}
      </div>

      {/* Filtros Ativos */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600">Filtros ativos:</span>
            {Object.entries(appliedFilters)
              .filter(([_, value]) => value !== '')
              .map(([fieldKey, value]) => {
                const field = fields.find(f => f.key === fieldKey);
                if (!field) return null;

                const displayValue = getDisplayValue(field, value);
                
                return (
                  <Badge 
                    key={fieldKey} 
                    variant="secondary" 
                    className="text-xs inline-flex items-center gap-1"
                  >
                    {field.label}: {displayValue}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFilter(fieldKey)}
                      className="h-4 w-4 p-0 hover:text-red-600 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilter;