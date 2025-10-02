import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, Grid, List, LayoutGrid } from 'lucide-react';
import { getModuleTheme } from '@/types/theme';

interface ViewToggleProps {
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  module: string; // Nome do módulo para aplicar o tema correto
  className?: string;
  iconOnly?: boolean; // Se deve mostrar apenas ícones (para layouts compactos)
}

/**
 * Toggle para alternar entre visualização de tabela e cards
 */
export const ViewToggle: React.FC<ViewToggleProps> = ({ 
  viewMode, 
  onViewModeChange,
  module,
  className,
  iconOnly = false
}) => {
  const theme = getModuleTheme(module);
  
  return (
    <div className={`flex items-center gap-1 ${className || ''}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewModeChange('table')}
        className={`h-7 lg:h-8 px-2 lg:px-3 ${viewMode === 'table' ? 'bg-white shadow-sm' : ''}`}
        title="Visualização em Tabela"
      >
        <List className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
        <span className="ml-1 2xl:inline hidden">Tabela</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewModeChange('cards')}
        className={`h-7 lg:h-8 px-2 lg:px-3 ${viewMode === 'cards' ? 'bg-white shadow-sm' : ''}`}
        title="Visualização em Cards"
      >
        <LayoutGrid className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
        <span className="ml-1 2xl:inline hidden">Cards</span>
      </Button>
    </div>
  );
};