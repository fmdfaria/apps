import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AppToast } from '@/services/toast';

import { 
  getConfiguracoes, 
  createConfiguracao, 
  updateConfiguracao, 
  deleteConfiguracao, 
  type CreateConfiguracaoData,
  type UpdateConfiguracaoData
} from '@/services/configuracoes';
import type { Configuracao } from '@/types/Configuracao';
import api from '@/services/api';
import { FormErrorMessage } from '@/components/form-error-message';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
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
  TableColumn,
  ResponsiveCardFooter 
} from '@/components/layout';
import { useViewMode } from '@/hooks/useViewMode';
import { useResponsiveTable } from '@/hooks/useResponsiveTable';
import { useTableFilters } from '@/hooks/useTableFilters';
import { getModuleTheme } from '@/types/theme';

// Opções para dropdowns
const tiposEntidade = [
  { id: 'convenio', nome: 'Convênio', sigla: undefined },
  { id: 'servico', nome: 'Serviço', sigla: undefined },
  { id: 'profissional', nome: 'Profissional', sigla: undefined },
  { id: 'global', nome: 'Global', sigla: undefined },
];

const tiposValor = [
  { id: 'string', nome: 'Texto (String)', sigla: undefined },
  { id: 'number', nome: 'Número', sigla: undefined },
  { id: 'boolean', nome: 'Verdadeiro/Falso (Boolean)', sigla: undefined },
  { id: 'json', nome: 'JSON', sigla: undefined },
  { id: 'date', nome: 'Data', sigla: undefined },
];

// Definir tipo de formulário separado
interface FormularioConfiguracao {
  entidadeTipo: string;
  entidadeId: string;
  contexto: string;
  chave: string;
  valor: string;
  tipoValor: string;
  descricao: string;
  ativo: boolean;
}

export const ConfiguracoesPage = () => {
  const theme = getModuleTheme('default');
  const [configuracoes, setConfiguracoes] = useState<Configuracao[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Configuracao | null>(null);
  const [form, setForm] = useState<FormularioConfiguracao>({
    entidadeTipo: '',
    entidadeId: '',
    contexto: '',
    chave: '',
    valor: '',
    tipoValor: 'string',
    descricao: '',
    ativo: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<Configuracao | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'configuracoes-view' });
  
  // Configuração das colunas da tabela com filtros dinâmicos
  const columns: TableColumn<Configuracao>[] = [
    {
      key: 'entidadeTipo',
      header: '🏢 Entidade',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Tipo da entidade...',
        label: 'Entidade'
      },
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 bg-gradient-to-r ${theme.primaryButton} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
            {item.entidadeTipo.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{item.entidadeTipo}</span>
        </div>
      )
    },
    {
      key: 'contexto',
      header: '📂 Contexto',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Contexto...',
        label: 'Contexto'
      },
      render: (item) => <span className="text-sm text-gray-600">{item.contexto}</span>
    },
    {
      key: 'chave',
      header: '🔑 Chave',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Chave...',
        label: 'Chave'
      },
      render: (item) => <span className="text-sm font-mono text-blue-600">{item.chave}</span>
    },
    {
      key: 'valor',
      header: '📋 Valor',
      essential: false,
      render: (item) => (
        <div className="max-w-[200px]">
          <span className="text-sm text-gray-600 block truncate" title={item.valor}>
            {item.valor}
          </span>
          <span className="text-xs text-gray-400 capitalize">({item.tipoValor})</span>
        </div>
      )
    },
    {
      key: 'ativo',
      header: '✅ Status',
      essential: false,
      render: (item) => (
        <span className={`inline-block text-xs px-2 py-1 rounded-full ${
          item.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'actions',
      header: '⚙️ Ações',
      essential: true,
      render: (item) => {
        return (
        <div className="flex gap-1.5">
          {canUpdate ? (
            <ActionButton
              variant="view"
              module="default"
              onClick={() => abrirModalEditar(item)}
              title="Editar Configuração"
            >
              <Edit className="w-4 h-4" />
            </ActionButton>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0 border-orange-300 text-orange-600 opacity-50 cursor-not-allowed"
                      disabled={true}
                      title="Sem permissão para editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para editar configurações</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {canDelete ? (
            <ActionButton
              variant="delete"
              module="default"
              onClick={() => confirmarExclusao(item)}
              title="Excluir Configuração"
            >
              <Trash2 className="w-4 h-4" />
            </ActionButton>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0 border-red-300 text-red-600 opacity-50 cursor-not-allowed"
                      disabled={true}
                      title="Sem permissão para excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para excluir configurações</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        );
      }
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
  const configuracoesFiltradas = useMemo(() => {
    // Primeiro aplicar busca textual
    let dadosFiltrados = configuracoes.filter(c =>
      c.chave.toLowerCase().includes(busca.toLowerCase()) ||
      c.contexto.toLowerCase().includes(busca.toLowerCase()) ||
      c.entidadeTipo.toLowerCase().includes(busca.toLowerCase()) ||
      (c.descricao && c.descricao.toLowerCase().includes(busca.toLowerCase()))
    );
    
    // Depois aplicar filtros dinâmicos
    return applyFilters(dadosFiltrados);
  }, [configuracoes, busca, applyFilters]);

  const {
    data: configuracoesPaginadas,
    totalItems,
    currentPage,
    itemsPerPage,
    totalPages,
    handlePageChange,
    handleItemsPerPageChange,
    // Infinite scroll específico
    isDesktop,
    isMobile,
    hasNextPage,
    isLoadingMore,
    targetRef
  } = useResponsiveTable(configuracoesFiltradas, 10);

  useEffect(() => {
    fetchConfiguracoes();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar cada permissão específica para configurações
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/configuracoes' && route.method.toLowerCase() === 'get';
      });
      
      const canCreate = allowedRoutes.some((route: any) => {
        return route.path === '/configuracoes' && route.method.toLowerCase() === 'post';
      });
      
      const canUpdate = allowedRoutes.some((route: any) => {
        return route.path === '/configuracoes/:id' && route.method.toLowerCase() === 'put';
      });
      
      const canDelete = allowedRoutes.some((route: any) => {
        return route.path === '/configuracoes/:id' && route.method.toLowerCase() === 'delete';
      });
      
      setCanCreate(canCreate);
      setCanUpdate(canUpdate);
      setCanDelete(canDelete);
      
      // Se não tem nem permissão de leitura, marca como access denied
      if (!canRead) {
        setAccessDenied(true);
      }
      
    } catch (error: any) {
      // Em caso de erro, desabilita tudo por segurança
      setCanCreate(false);
      setCanUpdate(false);
      setCanDelete(false);
      
      // Se retornar 401/403 no endpoint de permissões, considera acesso negado
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  const fetchConfiguracoes = async () => {
    setLoading(true);
    setAccessDenied(false);
    setConfiguracoes([]); // Limpa configurações para evitar mostrar dados antigos
    try {
      const data = await getConfiguracoes();
      setConfiguracoes(data);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/configuracoes', 'GET');
          setRouteInfo(info);
        } catch (routeError) {
          // Erro ao buscar informações da rota
        }
        // Não mostra toast aqui pois o interceptor já cuida disso
      } else {
        AppToast.error('Erro ao carregar configurações', {
          description: 'Ocorreu um problema ao carregar a lista de configurações. Tente novamente.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Renderização do card
  const renderCard = (configuracao: Configuracao) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">⚙️</span>
            <CardTitle className="text-sm font-medium truncate">{configuracao.chave}</CardTitle>
          </div>
          <div className={`w-8 h-8 bg-gradient-to-r ${theme.primaryButton} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {configuracao.entidadeTipo.charAt(0).toUpperCase()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-muted-foreground">Entidade:</span>
            <span className="text-xs font-medium text-blue-600 flex-1">
              {configuracao.entidadeTipo}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-muted-foreground">Contexto:</span>
            <span className="text-xs text-gray-600 flex-1">
              {configuracao.contexto}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-muted-foreground">Valor:</span>
            <span className="text-xs text-gray-600 flex-1 break-words">
              {configuracao.valor.length > 30 ? `${configuracao.valor.substring(0, 30)}...` : configuracao.valor}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`inline-block text-xs px-2 py-1 rounded-full capitalize ${
              configuracao.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {configuracao.ativo ? 'Ativo' : 'Inativo'}
            </span>
            <span className="text-xs text-gray-400 capitalize">
              {configuracao.tipoValor}
            </span>
          </div>
        </div>
      </CardContent>
      <ResponsiveCardFooter>
        {canUpdate ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white"
            onClick={() => abrirModalEditar(configuracao)}
            title="Editar configuração"
          >
            <Edit className="w-4 h-4" />
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-orange-300 text-orange-600 opacity-50 cursor-not-allowed"
                    disabled={true}
                    title="Sem permissão para editar"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para editar configurações</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {canDelete ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
            onClick={() => confirmarExclusao(configuracao)}
            title="Excluir configuração"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-red-300 text-red-600 opacity-50 cursor-not-allowed"
                    disabled={true}
                    title="Sem permissão para excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para excluir configurações</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </ResponsiveCardFooter>
    </Card>
  );

  // Funções de manipulação
  const abrirModalNova = () => {
    setEditando(null);
    setForm({
      entidadeTipo: '',
      entidadeId: '',
      contexto: '',
      chave: '',
      valor: '',
      tipoValor: 'string',
      descricao: '',
      ativo: true,
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (c: Configuracao) => {
    setEditando(c);
    setForm({
      entidadeTipo: c.entidadeTipo,
      entidadeId: c.entidadeId || '',
      contexto: c.contexto,
      chave: c.chave,
      valor: c.valor,
      tipoValor: c.tipoValor,
      descricao: c.descricao || '',
      ativo: c.ativo ?? true,
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      entidadeTipo: '',
      entidadeId: '',
      contexto: '',
      chave: '',
      valor: '',
      tipoValor: 'string',
      descricao: '',
      ativo: true,
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.entidadeTipo.trim()) {
      setFormError('O tipo de entidade é obrigatório.');
      AppToast.validation('Campo obrigatório', 'O tipo de entidade deve ser preenchido.');
      return;
    }
    if (!form.contexto.trim() || form.contexto.trim().length < 2) {
      setFormError('O contexto deve ter pelo menos 2 caracteres.');
      AppToast.validation('Contexto muito curto', 'O contexto deve ter pelo menos 2 caracteres.');
      return;
    }
    if (!form.chave.trim() || form.chave.trim().length < 2) {
      setFormError('A chave deve ter pelo menos 2 caracteres.');
      AppToast.validation('Chave muito curta', 'A chave deve ter pelo menos 2 caracteres.');
      return;
    }
    if (!form.valor.trim()) {
      setFormError('O valor é obrigatório.');
      AppToast.validation('Campo obrigatório', 'O valor deve ser preenchido.');
      return;
    }

    setFormLoading(true);
    try {
      const configData: CreateConfiguracaoData | UpdateConfiguracaoData = {
        entidadeTipo: form.entidadeTipo.trim(),
        entidadeId: form.entidadeId.trim() || null,
        contexto: form.contexto.trim(),
        chave: form.chave.trim(),
        valor: form.valor.trim(),
        tipoValor: form.tipoValor,
        descricao: form.descricao.trim() || null,
        ativo: form.ativo,
      };

      if (editando) {
        await updateConfiguracao(editando.id, configData as UpdateConfiguracaoData);
        AppToast.updated('Configuração', `A configuração "${form.chave.trim()}" foi atualizada com sucesso.`);
      } else {
        await createConfiguracao(configData as CreateConfiguracaoData);
        AppToast.created('Configuração', `A configuração "${form.chave.trim()}" foi criada com sucesso.`);
      }
      fecharModal();
      fetchConfiguracoes();
    } catch (e: any) {
      let title = 'Erro ao salvar configuração';
      let description = 'Não foi possível salvar a configuração. Verifique os dados e tente novamente.';
      
      if (e?.response?.status === 403) {
        // Erro de permissão será tratado pelo interceptor
        return;
      } else if (e?.response?.data?.message) {
        description = e.response.data.message;
      } else if (e?.message) {
        description = e.message;
      }
      
      AppToast.error(title, { description });
    } finally {
      setFormLoading(false);
    }
  };

  const confirmarExclusao = (c: Configuracao) => {
    setExcluindo(c);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteConfiguracao(excluindo.id);
      AppToast.deleted('Configuração', `A configuração "${excluindo.chave}" foi excluída permanentemente.`);
      setExcluindo(null);
      fetchConfiguracoes();
    } catch (e: any) {
      if (e?.response?.status === 403) {
        // Erro de permissão será tratado pelo interceptor
        return;
      }
      
      AppToast.error('Erro ao excluir configuração', {
        description: 'Não foi possível excluir a configuração. Tente novamente ou entre em contato com o suporte.'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando configurações...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header da página */}
      <PageHeader title="Configurações" module="default" icon="⚙️">
        <SearchBar
          placeholder="Buscar configurações..."
          value={busca}
          onChange={setBusca}
          module="default"
        />
        
        <FilterButton
          showFilters={mostrarFiltros}
          onToggleFilters={() => setMostrarFiltros(prev => !prev)}
          activeFiltersCount={activeFiltersCount}
          module="default"
          disabled={filterConfigs.length === 0}
          tooltip={filterConfigs.length === 0 ? 'Nenhum filtro configurado' : undefined}
        />
        
        <ViewToggle 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
          module="default"
        />
        
        {canCreate ? (
          <Button 
            className={`!h-10 bg-gradient-to-r ${theme.primaryButton} ${theme.primaryButtonHover} shadow-lg hover:shadow-xl transition-all duration-200 font-semibold`}
            onClick={abrirModalNova}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Configuração
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button 
                    className={`!h-10 bg-gradient-to-r ${theme.primaryButton} ${theme.primaryButtonHover} shadow-lg hover:shadow-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={true}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Configuração
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para criar configurações</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
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
          module="default"
        />

        {/* Conteúdo baseado no modo de visualização */}
        {accessDenied ? (
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
                <p>Você não tem permissão para visualizar configurações</p>
              )}
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <ResponsiveTable 
            data={configuracoesPaginadas}
            columns={columns}
            module="default"
            emptyMessage="Nenhuma configuração encontrada"
            isLoadingMore={isLoadingMore}
            hasNextPage={hasNextPage}
            isMobile={isMobile}
            scrollRef={targetRef}
          />
        ) : (
          <ResponsiveCards 
            data={configuracoesPaginadas}
            renderCard={renderCard}
            emptyMessage="Nenhuma configuração encontrada"
            emptyIcon="⚙️"
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
          module="default"
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Modal de cadastro/edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Configuração' : 'Nova Configuração'}</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-4">
              {/* Linha 1: Tipo Entidade | Contexto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">🏢</span>
                    <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Tipo Entidade</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <SingleSelectDropdown
                    options={tiposEntidade}
                    selected={form.entidadeTipo ? {
                      id: form.entidadeTipo,
                      nome: tiposEntidade.find(t => t.id === form.entidadeTipo)?.nome || form.entidadeTipo,
                      sigla: undefined
                    } : null}
                    onChange={(selected) => {
                      setForm(f => ({ ...f, entidadeTipo: selected?.id || '' }));
                    }}
                    placeholder="Selecione o tipo..."
                    headerText="Tipos de entidade"
                    formatOption={(option) => option.nome}
                    disabled={formLoading}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">📂</span>
                    <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Contexto</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={form.contexto}
                    onChange={e => setForm(f => ({ ...f, contexto: e.target.value }))}
                    disabled={formLoading}
                    minLength={2}
                    className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100"
                    placeholder="Ex: pedidos_medicos, agendamentos"
                  />
                </div>
              </div>

              {/* Linha 2: Entidade ID | Chave */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">🆔</span>
                    <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>ID da Entidade</span>
                    <span className="text-gray-400 text-xs">(Opcional)</span>
                  </label>
                  <Input
                    type="text"
                    value={form.entidadeId}
                    onChange={e => setForm(f => ({ ...f, entidadeId: e.target.value }))}
                    disabled={formLoading}
                    className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100"
                    placeholder="UUID da entidade (deixe vazio para global)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">🔑</span>
                    <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Chave</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={form.chave}
                    onChange={e => setForm(f => ({ ...f, chave: e.target.value }))}
                    disabled={formLoading}
                    minLength={2}
                    className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100 font-mono"
                    placeholder="Ex: crm_obrigatorio, max_agendamentos"
                  />
                </div>
              </div>

              {/* Linha 3: Valor | Tipo Valor */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Valor</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={form.valor}
                    onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                    disabled={formLoading}
                    className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100 min-h-[80px] font-mono"
                    placeholder="Valor da configuração (JSON para objetos complexos)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">🔤</span>
                    <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Tipo</span>
                  </label>
                  <SingleSelectDropdown
                    options={tiposValor}
                    selected={form.tipoValor ? {
                      id: form.tipoValor,
                      nome: tiposValor.find(t => t.id === form.tipoValor)?.nome || form.tipoValor,
                      sigla: undefined
                    } : null}
                    onChange={(selected) => {
                      setForm(f => ({ ...f, tipoValor: selected?.id || 'string' }));
                    }}
                    placeholder="Selecione o tipo..."
                    headerText="Tipos de valor"
                    formatOption={(option) => option.nome}
                    disabled={formLoading}
                  />
                </div>
              </div>

              {/* Linha 4: Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Descrição</span>
                  <span className="text-gray-400 text-xs">(Opcional)</span>
                </label>
                <Textarea
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  disabled={formLoading}
                  className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100"
                  placeholder="Descrição sobre o que esta configuração faz..."
                />
              </div>

              {formError && <FormErrorMessage>{formError}</FormErrorMessage>}
            </div> 
            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={formLoading}
                  className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6 transition-all duration-200"
                >
                  <span className="mr-2">🔴</span>
                  Cancelar
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={formLoading}
                className={`bg-gradient-to-r ${theme.primaryButton} ${theme.primaryButtonHover} shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200`}
              >
                {formLoading ? (
                  <>
                    <span className="mr-2">⏳</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🟢</span>
                    Salvar
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <ConfirmDeleteModal
        open={!!excluindo}
        onClose={cancelarExclusao}
        onConfirm={handleDelete}
        title="Confirmar Exclusão de Configuração"
        entityName={excluindo?.chave || ''}
        entityType="configuração"
        isLoading={deleteLoading}
        loadingText="Excluindo configuração..."
        confirmText="Excluir Configuração"
      />
    </PageContainer>
  );
};