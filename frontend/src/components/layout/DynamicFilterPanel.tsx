import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getModuleTheme } from '@/types/theme';
import { 
  FilterValue, 
  ExtractedFilterConfig, 
  BaseFilterProps,
  ActiveFilters 
} from '@/types/filters';

// Componente para filtro de texto
const TextFilter: React.FC<BaseFilterProps> = ({ value, onChange, config, className }) => {
  return (
    <Input
      type="text"
      placeholder={config.placeholder}
      value={value.text || ''}
      onChange={(e) => onChange({ text: e.target.value })}
      className={cn("h-8 text-sm", className)}
    />
  );
};

// Componente para filtro numérico
const NumberFilter: React.FC<BaseFilterProps> = ({ value, onChange, config, className }) => {
  return (
    <Input
      type="number"
      placeholder={config.placeholder}
      value={value.number !== undefined ? String(value.number) : ''}
      onChange={(e) => {
        const numValue = e.target.value === '' ? undefined : Number(e.target.value);
        onChange({ number: numValue });
      }}
      min={config.min}
      max={config.max}
      step={config.step}
      className={cn("h-8 text-sm", className)}
    />
  );
};

// Componente para filtro de data
const DateFilter: React.FC<BaseFilterProps> = ({ value, onChange, config, className }) => {
  return (
    <Input
      type="date"
      placeholder={config.placeholder}
      value={value.date || ''}
      onChange={(e) => onChange({ date: e.target.value })}
      className={cn("h-8 text-sm", className)}
    />
  );
};

// Componente para filtro de seleção
const SelectFilter: React.FC<BaseFilterProps> = ({ value, onChange, config, className }) => {
  return (
    <Select 
      value={value.select || ''} 
      onValueChange={(selectedValue) => onChange({ select: selectedValue })}
    >
      <SelectTrigger className={cn("h-8 text-sm", className)}>
        <SelectValue placeholder={config.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {config.options?.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// Componente para filtros de range (numérico, moeda, percentual)
const RangeFilter: React.FC<BaseFilterProps> = ({ value, onChange, config, className }) => {
  const rangeValue = value.range || {};
  
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Para moeda, permitir formatação
    if (config.type === 'currency') {
      newValue = newValue.replace(/[^\d,]/g, '');
      const partes = newValue.split(',');
      if (partes.length > 2) newValue = partes[0] + ',' + partes.slice(1).join('');
    }
    
    onChange({ 
      range: { 
        ...rangeValue, 
        min: newValue === '' ? undefined : newValue 
      } 
    });
  };
  
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Para moeda, permitir formatação
    if (config.type === 'currency') {
      newValue = newValue.replace(/[^\d,]/g, '');
      const partes = newValue.split(',');
      if (partes.length > 2) newValue = partes[0] + ',' + partes.slice(1).join('');
    }
    
    onChange({ 
      range: { 
        ...rangeValue, 
        max: newValue === '' ? undefined : newValue 
      } 
    });
  };

  const inputType = config.type === 'currency' ? 'text' : 'number';
  const minPlaceholder = config.type === 'currency' ? '0,00' : 
                        config.type === 'percentage' ? '0' : 
                        String(config.min || 0);
  const maxPlaceholder = config.type === 'currency' ? '999,99' : 
                        config.type === 'percentage' ? '100' : 
                        String(config.max || 999);

  return (
    <div className="grid grid-cols-2 gap-2">
      <Input
        type={inputType}
        placeholder={`Mín: ${minPlaceholder}`}
        value={rangeValue.min !== undefined ? String(rangeValue.min) : ''}
        onChange={handleMinChange}
        min={config.min}
        max={config.max}
        step={config.step}
        className={cn("h-8 text-sm", className)}
      />
      <Input
        type={inputType}
        placeholder={`Máx: ${maxPlaceholder}`}
        value={rangeValue.max !== undefined ? String(rangeValue.max) : ''}
        onChange={handleMaxChange}
        min={config.min}
        max={config.max}
        step={config.step}
        className={cn("h-8 text-sm", className)}
      />
    </div>
  );
};

// Componente principal do painel de filtros
interface DynamicFilterPanelProps {
  isVisible: boolean;
  filterConfigs: ExtractedFilterConfig[];
  activeFilters: ActiveFilters;
  onFilterChange: (columnKey: string, value: FilterValue) => void;
  onClearAll: () => void;
  onClose: () => void;
  module: string;
  className?: string;
}

export const DynamicFilterPanel: React.FC<DynamicFilterPanelProps> = ({
  isVisible,
  filterConfigs,
  activeFilters,
  onFilterChange,
  onClearAll,
  onClose,
  module,
  className
}) => {
  const theme = getModuleTheme(module);

  if (!isVisible) return null;

  // Determinar layout responsivo baseado no número de filtros
  const getGridClass = (count: number) => {
    if (count <= 3) return 'grid-cols-1 md:grid-cols-3';
    if (count <= 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  };

  // Renderizar campo de filtro baseado no tipo
  const renderFilterField = (filterConfig: ExtractedFilterConfig) => {
    const { key, config, header } = filterConfig;
    const currentValue = activeFilters[key] || {};
    
    const baseProps: BaseFilterProps = {
      value: currentValue,
      onChange: (value) => onFilterChange(key, value),
      config,
      className: ''
    };

    let FilterComponent: React.ComponentType<BaseFilterProps>;
    
    switch (config.type) {
      case 'text':
        FilterComponent = TextFilter;
        break;
      case 'number':
        FilterComponent = NumberFilter;
        break;
      case 'date':
        FilterComponent = DateFilter;
        break;
      case 'select':
        FilterComponent = SelectFilter;
        break;
      case 'range':
      case 'currency':
      case 'percentage':
        FilterComponent = RangeFilter;
        break;
      default:
        FilterComponent = TextFilter;
    }

    return (
      <div key={key}>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {config.label || header.replace(/[^\w\s]/g, '').trim()}
        </label>
        <FilterComponent {...baseProps} />
      </div>
    );
  };

  return (
    <div className={cn("mb-4 bg-white border border-gray-200 rounded-lg shadow-sm", className)}>
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span className="text-lg">🎯</span>
            Filtros
            {filterConfigs.length > 0 && (
              <Badge variant="outline" className="ml-2 text-xs">
                {filterConfigs.length} disponível{filterConfigs.length !== 1 ? 'is' : ''}
              </Badge>
            )}
          </h3>
          
          {/* Botões movidos para o header */}
          {filterConfigs.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="text-xs h-7"
              >
                Limpar Filtros
              </Button>
              <Button
                size="sm"
                onClick={onClose}
                className={cn(
                  "text-xs h-7 bg-gradient-to-r shadow-lg hover:shadow-xl transition-all duration-200",
                  theme.primaryButton,
                  theme.primaryButtonHover
                )}
              >
                Aplicar Filtros
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="p-4">
        {filterConfigs.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            Nenhum filtro configurado para esta tabela
          </div>
        ) : (
          <div className={cn("grid gap-4", getGridClass(filterConfigs.length))}>
            {filterConfigs.map(renderFilterField)}
          </div>
        )}
      </div>
    </div>
  );
};