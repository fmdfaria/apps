import { useState } from 'react';

export type ViewMode = 'table' | 'cards';

interface UseViewModeOptions {
  defaultMode?: ViewMode;
  persistMode?: boolean;
  localStorageKey?: string;
}

/**
 * Hook para gerenciar o modo de visualização (tabela/cards)
 */
export const useViewMode = (options: UseViewModeOptions = {}) => {
  const {
    defaultMode = 'table',
    persistMode = false,
    localStorageKey = 'viewMode'
  } = options;

  // Inicializar com valor do localStorage se persistir estiver habilitado
  const getInitialMode = (): ViewMode => {
    if (persistMode && typeof window !== 'undefined') {
      const savedMode = localStorage.getItem(localStorageKey) as ViewMode;
      if (savedMode === 'table' || savedMode === 'cards') {
        return savedMode;
      }
    }
    return defaultMode;
  };

  const [viewMode, setViewModeState] = useState<ViewMode>(getInitialMode);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    
    // Persistir no localStorage se habilitado
    if (persistMode && typeof window !== 'undefined') {
      localStorage.setItem(localStorageKey, mode);
    }
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'table' ? 'cards' : 'table';
    setViewMode(newMode);
  };

  return {
    viewMode,
    setViewMode,
    toggleViewMode,
    isTable: viewMode === 'table',
    isCards: viewMode === 'cards'
  };
};