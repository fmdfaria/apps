import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getModuleTheme } from '@/types/theme';

interface FilterButtonProps {
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFiltersCount: number;
  module: string; // Nome do módulo para aplicar o tema correto
  className?: string;
  disabled?: boolean; // Para desabilitar quando não há filtros configurados
  tooltip?: string; // Tooltip personalizado
}

/**
 * Botão de filtros com indicador de filtros ativos e cores do módulo
 */
export const FilterButton: React.FC<FilterButtonProps> = ({
  showFilters,
  onToggleFilters,
  activeFiltersCount,
  module,
  className,
  disabled = false,
  tooltip
}) => {
  const theme = getModuleTheme(module);
  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <Button
      variant="outline"
      onClick={onToggleFilters}
      disabled={disabled}
      title={tooltip}
      className={cn(
        "!h-10 border-2 border-gray-200 text-gray-700 font-medium transition-all duration-200",
        // Estado normal: hover com cores do módulo
        !disabled && `hover:!bg-gradient-to-r ${theme.hoverBg} ${theme.hoverTextColor}`,
        // Estado ativo (filtros abertos): fundo e borda do módulo
        showFilters && !disabled && `!bg-gradient-to-r ${theme.headerBg} !border-gray-300`,
        // Estado com filtros ativos: destaque nas cores do módulo
        hasActiveFilters && !disabled && `!bg-gradient-to-r ${theme.headerBg} !border-gray-300`,
        // Estado desabilitado
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <Filter className="w-4 h-4 mr-2" />
      Filtros
      {hasActiveFilters && !disabled && (
        <Badge 
          variant="secondary" 
          className={`ml-2 h-4 px-1.5 text-xs bg-gradient-to-r ${theme.primaryButton} text-white`}
        >
          {activeFiltersCount}
        </Badge>
      )}
    </Button>
  );
};