import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, Grid, List, LayoutGrid } from 'lucide-react';
import { getModuleTheme } from '@/types/theme';

interface ViewToggleProps {
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  module: string; // Nome do módulo para aplicar o tema correto
  className?: string;
}

/**
 * Toggle para alternar entre visualização de tabela e cards
 */
export const ViewToggle: React.FC<ViewToggleProps> = ({ 
  viewMode, 
  onViewModeChange,
  module,
  className 
}) => {
  const theme = getModuleTheme(module);
  
  return (
    <div className={`flex items-center !h-10 border-2 border-gray-200 rounded-lg bg-gray-50 overflow-hidden ${className || ''}`} style={{ minHeight: '40px' }}>
      <Button
        variant="ghost"
        size="default"
        onClick={() => onViewModeChange('table')}
        className={viewMode === 'table' 
          ? `!h-10 !px-4 !bg-gradient-to-r ${theme.primaryButton} !text-white !shadow-lg font-semibold !border-0 !rounded-none !m-0 flex-1` 
          : `!h-10 !px-4 !bg-transparent !text-gray-600 hover:!bg-gradient-to-r ${theme.hoverBg} ${theme.hoverTextColor} !transition-all !duration-200 !rounded-none !m-0 flex-1`
        }
      >
        <List className="w-4 h-4 mr-1" />
        <span className="hidden sm:inline">Tabela</span>
      </Button>
      <div className="w-px h-6 bg-gray-300"></div>
      <Button
        variant="ghost"
        size="default"
        onClick={() => onViewModeChange('cards')}
        className={viewMode === 'cards' 
          ? `!h-10 !px-4 !bg-gradient-to-r ${theme.primaryButton} !text-white !shadow-lg font-semibold !border-0 !rounded-none !m-0 flex-1` 
          : `!h-10 !px-4 !bg-transparent !text-gray-600 hover:!bg-gradient-to-r ${theme.hoverBg} ${theme.hoverTextColor} !transition-all !duration-200 !rounded-none !m-0 flex-1`
        }
      >
        <LayoutGrid className="w-4 h-4 mr-1" />
        <span className="hidden sm:inline">Cards</span>
      </Button>
    </div>
  );
};