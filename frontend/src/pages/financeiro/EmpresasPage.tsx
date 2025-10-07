import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Building2, Power, PowerOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppToast } from '@/services/toast';
import { getEmpresas, createEmpresa, updateEmpresa, deleteEmpresa, updateEmpresaStatus } from '@/services/empresas';
import type { Empresa } from '@/types/Empresa';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import api from '@/services/api';

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
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  
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
            variant={item.ativo ? "warning" : "success"}
            module="financeiro"
            onClick={() => handleToggleStatus(item)}
            title={item.ativo ? "Desativar empresa" : "Ativar empresa"}
          >
            {item.ativo ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
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

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/empresas' && route.method.toLowerCase() === 'get';
      });
      if (!canRead) {
        setAccessDenied(true);
      }
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  useEffect(() => {
    checkPermissions();
    fetchData();
  }, []);

  const fetchData = async () => {
    setAccessDenied(false);
    setLoading(true);
    setEmpresas([]);
    try {
      const data = await getEmpresas();
      setEmpresas(data);
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
      if (error?.response?.status === 403) {
        const info = await getRouteInfo('/empresas');
        setRouteInfo(info);
        setAccessDenied(true);
      } else {
        AppToast.error('Erro ao carregar empresas', {
          description: 'Ocorreu um problema ao carregar os dados. Tente novamente.'
        });
      }
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
      
      let title = 'Erro ao salvar empresa';
      let description = 'Ocorreu um problema ao salvar os dados. Tente novamente.';
      
      if (error?.response?.data?.message) {
        description = error.response.data.message;
      } else if (error?.message) {
        description = error.message;
      }
      
      AppToast.error(title, { description });
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

  const handleToggleStatus = async (empresa: Empresa) => {
    try {
      const novoStatus = !empresa.ativo;
      await updateEmpresaStatus(empresa.id, novoStatus);
      
      AppToast.success(
        'Status alterado', 
        `A empresa "${empresa.razaoSocial}" foi ${novoStatus ? 'ativada' : 'desativada'} com sucesso.`
      );
      
      await fetchData();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      
      let description = 'Não foi possível alterar o status da empresa. Tente novamente.';
      if (error?.response?.data?.message) {
        description = error.response.data.message;
      } else if (error?.message) {
        description = error.message;
      }
      
      AppToast.error('Erro ao alterar status', { description });
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
          variant={empresa.ativo ? "warning" : "success"}
          module="financeiro"
          onClick={() => handleToggleStatus(empresa)}
          title={empresa.ativo ? "Desativar empresa" : "Ativar empresa"}
        >
          {empresa.ativo ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
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

  if (accessDenied) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <p className="text-red-600 font-medium mb-2">Acesso Negado</p>
          <div className="text-gray-600 text-sm space-y-1 max-w-md">
            {routeInfo ? (
              <>
                <p><strong>Rota:</strong> {routeInfo.nome}</p>
                <p><strong>Descrição:</strong> {routeInfo.descricao}</p>
                {routeInfo.modulo && <p><strong>Módulo:</strong> {routeInfo.modulo}</p>}
                <p className="text-gray-400 mt-2">Você não tem permissão para acessar este recurso</p>
              </>
            ) : (
              <p>Você não tem permissão para acessar este recurso</p>
            )}
          </div>
        </div>
      </PageContainer>
    );
  }

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