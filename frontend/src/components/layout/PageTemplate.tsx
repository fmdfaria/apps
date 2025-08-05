import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { 
  PageContainer, 
  PageHeader, 
  PageContent, 
  ViewToggle, 
  SearchBar, 
  FilterButton,
  ResponsiveTable, 
  ResponsiveCards, 
  ResponsivePagination,
  TableColumn 
} from '@/components/layout';
import { useViewMode } from '@/hooks/useViewMode';
import { useResponsiveTable } from '@/hooks/useResponsiveTable';
import { getModuleTheme } from '@/types/theme';

interface PageTemplateProps<T> {
  // Configuração do módulo
  module: string;
  title: string;
  icon?: React.ReactNode;
  
  // Dados e configuração
  data: T[];
  columns: TableColumn<T>[];
  renderCard: (item: T, index: number) => React.ReactNode;
  
  // Configurações opcionais
  searchPlaceholder?: string;
  searchValue?: string;
  emptyMessage?: string;
  emptyIcon?: string;
  
  // Handlers
  onAdd?: () => void;
  onSearch?: (term: string) => void;
  
  // Filtros
  showFilters?: boolean;
  onToggleFilters?: () => void;
  activeFiltersCount?: number;
  
  // Estado de loading
  isLoading?: boolean;
  
  // Props adicionais
  className?: string;
}

/**
 * Template padrão para páginas CRUD com responsividade e temas personalizados
 */
export const PageTemplate = <T extends Record<string, any>>({
  module,
  title,
  icon,
  data,
  columns,
  renderCard,
  searchPlaceholder = "Buscar...",
  searchValue = "",
  emptyMessage,
  emptyIcon,
  onAdd,
  onSearch,
  showFilters = false,
  onToggleFilters,
  activeFiltersCount = 0,
  isLoading = false,
  className
}: PageTemplateProps<T>) => {
  const { viewMode, setViewMode } = useViewMode();
  const theme = getModuleTheme(module);
  const {
    data: processedData,
    totalItems,
    currentPage,
    itemsPerPage,
    totalPages,
    handlePageChange,
    handleItemsPerPageChange
  } = useResponsiveTable(data);

  if (isLoading) {
    return (
      <PageContainer className={className}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className={className}>
      {/* Header da página */}
      <PageHeader title={title} module={module} icon={icon}>
        <SearchBar
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(value) => onSearch?.(value)}
          module={module}
        />
        
        {onToggleFilters && (
          <FilterButton
            showFilters={showFilters}
            onToggleFilters={onToggleFilters}
            activeFiltersCount={activeFiltersCount}
            module={module}
          />
        )}
        
        <ViewToggle 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
          module={module}
        />
        
        {onAdd && (
          <Button 
            className={`!h-10 bg-gradient-to-r ${theme.primaryButton} ${theme.primaryButtonHover} shadow-lg hover:shadow-xl transition-all duration-200 font-semibold`}
            onClick={onAdd}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        )}
      </PageHeader>

      {/* Conteúdo principal */}
      <PageContent>
        {/* Conteúdo baseado no modo de visualização */}
        {viewMode === 'table' ? (
          <ResponsiveTable 
            data={processedData}
            columns={columns}
            module={module}
            emptyMessage={emptyMessage}
          />
        ) : (
          <ResponsiveCards 
            data={processedData}
            renderCard={renderCard}
            emptyMessage={emptyMessage}
            emptyIcon={emptyIcon}
          />
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <ResponsivePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            module={module}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </PageContent>
    </PageContainer>
  );
};