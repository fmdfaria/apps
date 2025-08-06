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
  iconOnly?: boolean; // Se deve mostrar apenas o ícone (para layouts compactos)
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
  tooltip,
  iconOnly = false
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
        // Base styles - override shadcn defaults
        "h-10 border-2 font-medium relative",
        "transition-colors duration-200",
        "hover:bg-accent/0", // Remove default hover
        // Size configuration
        iconOnly ? "w-10 px-0" : "px-4",
        // State-based styling
        (showFilters || hasActiveFilters) && !disabled 
          ? `bg-gradient-to-r ${theme.headerBg} border-gray-300 text-gray-800`
          : "border-gray-200 text-gray-700 bg-white",
        // Hover state only when inactive
        !disabled && !(showFilters || hasActiveFilters) && 
          `hover:bg-gradient-to-r ${theme.hoverBg} hover:border-gray-300 hover:text-gray-800`,
        // Disabled state
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <Filter className={cn("w-4 h-4", iconOnly ? "" : "mr-2")} />
      {!iconOnly && "Filtros"}
      {hasActiveFilters && !disabled && (
        <Badge 
          variant="secondary" 
          className={cn(
            `h-4 px-1.5 text-xs bg-gradient-to-r ${theme.primaryButton} text-white`,
            iconOnly ? "absolute -top-1 -right-1" : "ml-2"
          )}
        >
          {activeFiltersCount}
        </Badge>
      )}
    </Button>
  );
};