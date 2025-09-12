import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppToast } from '@/services/toast';
import { getEmpresas, createEmpresa, updateEmpresa, deleteEmpresa } from '@/services/empresas';
import type { Empresa } from '@/types/Empresa';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { 
  PageContainer, 
  PageHeader, 
  PageContent, 
  ViewToggle, 
  SearchBar, 
  FilterButton,
  DynamicFilterPanel,
  ResponsiveTable, 
  ResponsiveCards, 
  ResponsivePagination,
  ActionButton,
  ResponsiveCardFooter,
  TableColumn 
} from '@/components/layout';
import type { FilterConfig } from '@/types/filters';
import { useViewMode } from '@/hooks/useViewMode';
import { useResponsiveTable } from '@/hooks/useResponsiveTable';
import { useTableFilters } from '@/hooks/useTableFilters';
import { getModuleTheme } from '@/types/theme';

// Modal Components
import EmpresaModal from './EmpresaModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

export const EmpresasPage = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [excluindo, setExcluindo] = useState<Empresa | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'empresas-view' });
  
  // Configuração das colunas da tabela
  const columns: TableColumn<Empresa>[] = [
    {
      key: 'razaoSocial',
      header: '🏢 Razão Social',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Razão social...',
        label: 'Razão Social'
      },
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {item.razaoSocial.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{item.razaoSocial}</span>
        </div>
      )
    },
    {
      key: 'nomeFantasia',
      header: '🏪 Nome Fantasia',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome fantasia...',
        label: 'Nome Fantasia'
      },
      render: (item) => (
        <span className="text-sm">{item.nomeFantasia || '-'}</span>
      )
    },
    {
      key: 'cnpj',
      header: '📄 CNPJ',
      essential: false,
      render: (item) => (
        <span className="text-sm font-mono">{item.cnpj || '-'}</span>
      )
    },
    {
      key: 'telefone',
      header: '📞 Telefone',
      essential: false,
      render: (item) => (
        <span className="text-sm font-mono bg-blue-100 px-2 py-1 rounded text-blue-700">
          {item.telefone || '-'}
        </span>
      )
    },
    {
      key: 'empresaPrincipal',
      header: '⭐ Principal',
      essential: true,
      filterable: {
        type: 'select',
        options: [
          { value: 'true', label: 'Principal' },
          { value: 'false', label: 'Filial' }
        ],
        label: 'Tipo'
      },
      render: (item) => (
        <Badge 
          variant="outline" 
          className={`text-xs ${
            item.empresaPrincipal 
              ? 'bg-green-50 text-green-700 border-green-200' 
              : 'bg-gray-50 text-gray-700 border-gray-200'
          }`}
        >
          {item.empresaPrincipal ? 'Principal' : 'Filial'}
        </Badge>
      )
    },
    {
      key: 'ativo',
      header: '📊 Status',
      essential: true,
      render: (item) => (
        <Badge 
          variant="outline" 
          className={`text-xs ${
            item.ativo === true
              ? 'bg-green-50 text-green-700 border-green-200' 
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {item.ativo === true ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: '⚙️ Ações',
      essential: true,
      render: (item) => (
        <div className="flex gap-1.5">
          <ActionButton
            variant="view"
            module="financeiro"
            onClick={() => abrirModalEditar(item)}
            title="Editar empresa"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          
          <ActionButton
            variant="delete"
            module="financeiro"
            onClick={() => setExcluindo(item)}
            title="Excluir empresa"
          >
            <Trash2 className="w-4 h-4" />
          </ActionButton>
        </div>
      )
    }
  ];
  
  // Sistema de filtros dinâmicos
  const {
    activeFilters,
    filterConfigs,
    activeFiltersCount,
    setFilter,
    clearFilter,
    clearAllFilters,
    applyFilters
  } = useTableFilters(columns);
  
  // Estado para mostrar/ocultar painel de filtros
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Filtrar dados baseado na busca e filtros dinâmicos
  const empresasFiltradas = useMemo(() => {
    const normalizarBusca = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

    let dadosFiltrados = empresas.filter(empresa => {
      if (busca.trim() === '') return true;
      
      const buscaNormalizada = normalizarBusca(busca);
      const razaoSocial = normalizarBusca(empresa.razaoSocial);
      const nomeFantasia = normalizarBusca(empresa.nomeFantasia || '');
      
      return razaoSocial.includes(buscaNormalizada) || nomeFantasia.includes(buscaNormalizada);
    }).sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial, 'pt-BR', { sensitivity: 'base' }));
    
    return applyFilters(dadosFiltrados);
  }, [empresas, busca, applyFilters]);

  const {
    data: empresasPaginadas,
    totalItems,
    currentPage,
    itemsPerPage,
    totalPages,
    handlePageChange,
    handleItemsPerPageChange,
    isDesktop,
    isMobile,
    hasNextPage,
    isLoadingMore,
    targetRef
  } = useResponsiveTable(empresasFiltradas, 10);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getEmpresas();
      setEmpresas(data);
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
      AppToast.error('Erro ao carregar empresas', {
        description: 'Ocorreu um problema ao carregar os dados. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNovo = () => {
    setEditando(null);
    setShowModal(true);
  };

  const abrirModalEditar = (empresa: Empresa) => {
    setEditando(empresa);
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
  };

  const handleSave = async (data: any) => {
    try {
      if (editando) {
        await updateEmpresa(editando.id, data);
        AppToast.updated('Empresa', 'Os dados da empresa foram atualizados com sucesso.');
      } else {
        await createEmpresa(data);
        AppToast.created('Empresa', 'A nova empresa foi cadastrada com sucesso.');
      }
      await fetchData();
      fecharModal();
    } catch (error: any) {
      console.error('Erro ao salvar empresa:', error);
      AppToast.error('Erro ao salvar empresa');
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteEmpresa(excluindo.id);
      AppToast.deleted('Empresa', `A empresa "${excluindo.razaoSocial}" foi excluída permanentemente.`);
      setExcluindo(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      
      let title = 'Erro ao excluir empresa';
      let description = 'Não foi possível excluir a empresa. Tente novamente ou entre em contato com o suporte.';
      
      if (error?.response?.data?.message) {
        description = error.response.data.message;
      } else if (error?.message) {
        description = error.message;
      }
      
      AppToast.error(title, { description });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Renderização do card
  const renderCard = (empresa: Empresa) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {empresa.razaoSocial.charAt(0).toUpperCase()}
            </div>
            <CardTitle className="text-sm font-medium truncate">{empresa.razaoSocial}</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs ml-2 flex-shrink-0 ${
              empresa.empresaPrincipal
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-gray-50 text-gray-700 border-gray-200'
            }`}
          >
            {empresa.empresaPrincipal ? 'Principal' : 'Filial'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-1 gap-2 text-xs">
            {empresa.nomeFantasia && (
              <div className="flex items-center gap-1">
                <span>🏪</span>
                <span className="text-gray-600">{empresa.nomeFantasia}</span>
              </div>
            )}
            
            {empresa.cnpj && (
              <div className="flex items-center gap-1">
                <span>📄</span>
                <span className="font-mono text-gray-600">{empresa.cnpj}</span>
              </div>
            )}

            {empresa.telefone && (
              <div className="flex items-center gap-1">
                <span>📞</span>
                <span className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-700">
                  {empresa.telefone}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <ResponsiveCardFooter>
        <ActionButton
          variant="view"
          module="financeiro"
          onClick={() => abrirModalEditar(empresa)}
          title="Editar empresa"
        >
          <Edit className="w-4 h-4" />
        </ActionButton>
        <ActionButton
          variant="delete"
          module="financeiro"
          onClick={() => setExcluindo(empresa)}
          title="Excluir empresa"
        >
          <Trash2 className="w-4 h-4" />
        </ActionButton>
      </ResponsiveCardFooter>
    </Card>
  );

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando empresas...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <TooltipProvider>
      <PageContainer>
        {/* Header da página */}
        <PageHeader title="Empresas" module="financeiro" icon="🏢">
          <SearchBar
            placeholder="Buscar por razão social ou nome fantasia..."
            value={busca}
            onChange={setBusca}
            module="financeiro"
          />
          
          <FilterButton
            showFilters={mostrarFiltros}
            onToggleFilters={() => setMostrarFiltros(prev => !prev)}
            activeFiltersCount={activeFiltersCount}
            module="financeiro"
            disabled={filterConfigs.length === 0}
          />
          
          <ViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode} 
            module="financeiro"
          />
          
          <Button 
            className={`!h-10 bg-gradient-to-r ${getModuleTheme('financeiro').primaryButton} ${getModuleTheme('financeiro').primaryButtonHover} shadow-lg hover:shadow-xl transition-all duration-200 font-semibold`}
            onClick={abrirModalNovo}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Empresa
          </Button>
        </PageHeader>

        {/* Conteúdo principal */}
        <PageContent>
          {/* Painel de Filtros Dinâmicos */}
          <DynamicFilterPanel
            isVisible={mostrarFiltros}
            filterConfigs={filterConfigs}
            activeFilters={activeFilters}
            onFilterChange={setFilter}
            onClearAll={clearAllFilters}
            onClose={() => setMostrarFiltros(false)}
            module="financeiro"
          />

          {/* Conteúdo baseado no modo de visualização */}
          {viewMode === 'table' ? (
            <ResponsiveTable 
              data={empresasPaginadas}
              columns={columns}
              module="financeiro"
              emptyMessage="Nenhuma empresa encontrada"
              isLoadingMore={isLoadingMore}
              hasNextPage={hasNextPage}
              isMobile={isMobile}
              scrollRef={targetRef}
            />
          ) : (
            <ResponsiveCards 
              data={empresasPaginadas}
              renderCard={renderCard}
              emptyMessage="Nenhuma empresa encontrada"
              emptyIcon="🏢"
              isLoadingMore={isLoadingMore}
              hasNextPage={hasNextPage}
              isMobile={isMobile}
              scrollRef={targetRef}
            />
          )}
        </PageContent>

        {/* Paginação */}
        {totalItems > 0 && (
          <ResponsivePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            module="financeiro"
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}

        {/* Modais */}
        <EmpresaModal
          isOpen={showModal}
          empresa={editando}
          onClose={fecharModal}
          onSave={handleSave}
        />
        
        <ConfirmDeleteModal
          open={!!excluindo}
          onClose={() => setExcluindo(null)}
          onConfirm={handleDelete}
          title="Confirmar Exclusão de Empresa"
          entityName={excluindo?.razaoSocial || ''}
          entityType="empresa"
          isLoading={deleteLoading}
          loadingText="Excluindo empresa..."
          confirmText="Excluir Empresa"
        />
      </PageContainer>
    </TooltipProvider>
  );
};