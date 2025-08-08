import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Route as RouteIcon, UserX, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { rbacService } from '@/services/rbac';
import type { Route, CreateRouteRequest, UpdateRouteRequest } from '@/types/RBAC';
import { FormErrorMessage } from '@/components/form-error-message';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
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
import type { FilterConfig } from '@/types/filters';
import { useViewMode } from '@/hooks/useViewMode';
import { useResponsiveTable } from '@/hooks/useResponsiveTable';
import { useTableFilters } from '@/hooks/useTableFilters';

interface RouteFormData {
  path: string;
  method: string;
  nome: string;
  descricao: string;
  modulo: string;
  ativo: boolean;
}

const MODULES = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'pacientes', label: 'Pacientes' },
  { value: 'profissionais', label: 'Profissionais' },
  { value: 'agendamentos', label: 'Agendamentos' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'convenios', label: 'Convênios' },
  { value: 'especialidades', label: 'Especialidades' },
  { value: 'admin', label: 'Administração' },
  { value: 'relatorios', label: 'Relatórios' },
  { value: 'configuracoes', label: 'Configurações' },
];

const METHODS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH', label: 'PATCH' },
];

function getMethodColor(method: string) {
  const colors = {
    'GET': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'POST': { bg: 'bg-green-100', text: 'text-green-800' },
    'PUT': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'DELETE': { bg: 'bg-red-100', text: 'text-red-800' },
    'PATCH': { bg: 'bg-purple-100', text: 'text-purple-800' }
  };
  return colors[method as keyof typeof colors] || { bg: 'bg-gray-100', text: 'text-gray-800' };
}

function getModuleColor(modulo: string) {
  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-800' },
    { bg: 'bg-green-100', text: 'text-green-800' },
    { bg: 'bg-purple-100', text: 'text-purple-800' },
    { bg: 'bg-orange-100', text: 'text-orange-800' },
    { bg: 'bg-pink-100', text: 'text-pink-800' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800' },
    { bg: 'bg-cyan-100', text: 'text-cyan-800' },
    { bg: 'bg-teal-100', text: 'text-teal-800' },
  ];
  
  let hash = 0;
  for (let i = 0; i < modulo.length; i++) {
    const char = modulo.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export const RoutesPage = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Route | null>(null);
  const [form, setForm] = useState<RouteFormData>({
    path: '',
    method: '',
    nome: '',
    descricao: '',
    modulo: '',
    ativo: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<Route | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'routes-view' });
  
  // Configuração das colunas da tabela
  const columns: TableColumn<Route>[] = [
    {
      key: 'method',
      header: '🔧 Método',
      essential: true,
      className: 'text-center',
      filterable: {
        type: 'select',
        label: 'Método HTTP',
        options: METHODS.map(m => ({ value: m.value, label: m.label }))
      },
      render: (item) => {
        const colors = getMethodColor(item.method);
        return (
          <Badge className={`${colors.bg} ${colors.text} text-xs font-medium`}>
            {item.method}
          </Badge>
        );
      }
    },
    {
      key: 'path',
      header: '🔗 Caminho',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Caminho da rota...',
        label: 'Caminho'
      },
      render: (item) => <code className="text-xs bg-gray-100 px-2 py-1 rounded">{item.path}</code>
    },
    {
      key: 'nome',
      header: '📝 Nome',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome da rota...',
        label: 'Nome'
      },
      render: (item) => <span className="text-sm font-medium">{item.nome}</span>
    },
    {
      key: 'modulo',
      header: '📦 Módulo',
      essential: true,
      className: 'text-center',
      filterable: {
        type: 'select',
        label: 'Módulo',
        options: MODULES.map(m => ({ value: m.value, label: m.label }))
      },
      render: (item) => {
        if (item.modulo) {
          const colors = getModuleColor(item.modulo);
          const moduleLabel = MODULES.find(m => m.value === item.modulo)?.label || item.modulo;
          return (
            <Badge className={`${colors.bg} ${colors.text} text-xs font-medium`}>
              {moduleLabel}
            </Badge>
          );
        }
        return <span className="text-gray-400 text-xs">-</span>;
      }
    },
    {
      key: 'descricao',
      header: '📄 Descrição',
      essential: false,
      filterable: {
        type: 'text',
        placeholder: 'Buscar na descrição...',
        label: 'Descrição'
      },
      render: (item) => <span className="text-sm">{item.descricao || '-'}</span>
    },
    {
      key: 'ativo',
      header: '🟢 Status',
      essential: true,
      className: 'text-center',
      filterable: {
        type: 'select',
        label: 'Status',
        options: [
          { value: 'true', label: 'Ativo' },
          { value: 'false', label: 'Inativo' }
        ]
      },
      render: (item) => (
        <Badge variant={item.ativo ? "default" : "secondary"}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
    {
      key: 'createdAt',
      header: '📅 Criado em',
      essential: false,
      className: 'text-center',
      render: (item) => (
        <span className="text-sm text-gray-600">
          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
        </span>
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
            module="routes"
            onClick={() => abrirModalEditar(item)}
            title="Editar Rota"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant={item.ativo ? "warning" : "success"}
            module="routes"
            onClick={() => toggleRouteStatus(item)}
            title={item.ativo ? "Desativar Rota" : "Ativar Rota"}
          >
            {item.ativo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </ActionButton>
          <ActionButton
            variant="delete"
            module="routes"
            onClick={() => confirmarExclusao(item)}
            title="Excluir Rota"
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
  const routesFiltradas = useMemo(() => {
    // Primeiro aplicar busca textual
    let dadosFiltrados = routes.filter(r =>
      r.nome.toLowerCase().includes(busca.toLowerCase()) ||
      r.path.toLowerCase().includes(busca.toLowerCase()) ||
      r.method.toLowerCase().includes(busca.toLowerCase()) ||
      (r.descricao || '').toLowerCase().includes(busca.toLowerCase()) ||
      (r.modulo || '').toLowerCase().includes(busca.toLowerCase())
    );
    
    return applyFilters(dadosFiltrados);
  }, [routes, busca, applyFilters]);

  const {
    data: routesPaginadas,
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
  } = useResponsiveTable(routesFiltradas, 10);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const data = await rbacService.getRoutes();
      setRoutes(data);
    } catch (e) {
      toast.error('Erro ao carregar rotas');
    } finally {
      setLoading(false);
    }
  };

  // Renderização do card
  const renderCard = (route: Route) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <RouteIcon className="w-5 h-5 text-sky-600" />
            <CardTitle className="text-sm font-medium truncate">{route.nome}</CardTitle>
          </div>
          <div className="flex gap-1 flex-shrink-0 ml-2">
            {(() => {
              const methodColors = getMethodColor(route.method);
              return (
                <Badge className={`text-xs ${methodColors.bg} ${methodColors.text}`}>
                  {route.method}
                </Badge>
              );
            })()}
            <Badge variant={route.ativo ? "default" : "secondary"}>
              {route.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2 mb-3">
          <div className="text-xs">
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{route.path}</code>
          </div>
          
          {route.modulo && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Módulo:</span>
              {(() => {
                const colors = getModuleColor(route.modulo);
                const moduleLabel = MODULES.find(m => m.value === route.modulo)?.label || route.modulo;
                return (
                  <Badge className={`text-xs ${colors.bg} ${colors.text}`}>
                    {moduleLabel}
                  </Badge>
                );
              })()}
            </div>
          )}
          
          {route.descricao && (
            <CardDescription className="line-clamp-2 text-xs">
              {route.descricao}
            </CardDescription>
          )}
          
          <div className="text-xs text-gray-500">
            <span>Criado em: {new Date(route.createdAt).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="text-xs text-gray-500">
            <span>ID: {route.id.slice(0, 8)}...</span>
          </div>
        </div>
      </CardContent>
      <ResponsiveCardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-sky-300 text-sky-600 hover:bg-sky-600 hover:text-white"
          onClick={() => abrirModalEditar(route)}
          title="Editar rota"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className={
            route.ativo 
              ? 'border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white'
              : 'border-green-300 text-green-600 hover:bg-green-600 hover:text-white'
          }
          onClick={() => toggleRouteStatus(route)}
          title={route.ativo ? "Desativar rota" : "Ativar rota"}
        >
          {route.ativo ? (
            <UserX className="w-4 h-4" />
          ) : (
            <UserCheck className="w-4 h-4" />
          )}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
          onClick={() => confirmarExclusao(route)}
          title="Excluir rota"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </ResponsiveCardFooter>
    </Card>
  );

  // Funções de manipulação
  const abrirModalNovo = () => {
    setEditando(null);
    setForm({
      path: '',
      method: '',
      nome: '',
      descricao: '',
      modulo: '',
      ativo: true,
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (route: Route) => {
    setEditando(route);
    setForm({
      path: route.path,
      method: route.method,
      nome: route.nome,
      descricao: route.descricao || '',
      modulo: route.modulo || '',
      ativo: route.ativo,
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      path: '',
      method: '',
      nome: '',
      descricao: '',
      modulo: '',
      ativo: true,
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || form.nome.trim().length < 2) {
      setFormError('O nome deve ter pelo menos 2 caracteres.');
      return;
    }
    if (!form.path.trim()) {
      setFormError('O caminho é obrigatório.');
      return;
    }
    if (!form.method.trim()) {
      setFormError('O método HTTP é obrigatório.');
      return;
    }

    setFormLoading(true);
    try {
      if (editando) {
        const payload: UpdateRouteRequest = {
          path: form.path,
          method: form.method,
          nome: form.nome,
          descricao: form.descricao || undefined,
          modulo: form.modulo || undefined,
          ativo: form.ativo,
        };
        await rbacService.updateRoute(editando.id, payload);
        toast.success('Rota atualizada com sucesso');
      } else {
        const payload: CreateRouteRequest = {
          path: form.path,
          method: form.method,
          nome: form.nome,
          descricao: form.descricao || undefined,
          modulo: form.modulo || undefined,
        };
        await rbacService.createRoute(payload);
        toast.success('Rota criada com sucesso');
      }
      fecharModal();
      fetchRoutes();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erro ao salvar rota';
      toast.error(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const toggleRouteStatus = async (route: Route) => {
    try {
      const payload: UpdateRouteRequest = {
        path: route.path,
        method: route.method,
        nome: route.nome,
        descricao: route.descricao || undefined,
        modulo: route.modulo || undefined,
        ativo: !route.ativo,
      };
      await rbacService.updateRoute(route.id, payload);
      toast.success(`Rota ${!route.ativo ? 'ativada' : 'desativada'} com sucesso`);
      fetchRoutes();
    } catch (e) {
      toast.error('Erro ao alterar status da rota');
    }
  };

  const confirmarExclusao = (route: Route) => {
    setExcluindo(route);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await rbacService.deleteRoute(excluindo.id);
      toast.success('Rota excluída com sucesso');
      setExcluindo(null);
      fetchRoutes();
    } catch (e) {
      toast.error('Erro ao excluir rota');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando rotas...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
      <PageContainer>
        {/* Header da página */}
        <PageHeader title="Gerenciar Rotas" module="routes" icon={<RouteIcon />}>
          <SearchBar
            placeholder="Buscar rotas..."
            value={busca}
            onChange={setBusca}
            module="routes"
          />
          
          <FilterButton
            showFilters={mostrarFiltros}
            onToggleFilters={() => setMostrarFiltros(prev => !prev)}
            activeFiltersCount={activeFiltersCount}
            module="routes"
            disabled={filterConfigs.length === 0}
            tooltip={filterConfigs.length === 0 ? 'Nenhum filtro configurado' : undefined}
          />
          
          <ViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode} 
            module="routes"
          />
          
          <Button 
            className="!h-10 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
            onClick={abrirModalNovo}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Rota
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
            module="routes"
          />

          {/* Conteúdo baseado no modo de visualização */}
          {viewMode === 'table' ? (
            <ResponsiveTable 
              data={routesPaginadas}
              columns={columns}
              module="routes"
              emptyMessage="Nenhuma rota encontrada"
              isLoadingMore={isLoadingMore}
              hasNextPage={hasNextPage}
              isMobile={isMobile}
              scrollRef={targetRef}
            />
          ) : (
            <ResponsiveCards 
              data={routesPaginadas}
              renderCard={renderCard}
              emptyMessage="Nenhuma rota encontrada"
              emptyIcon="🔗"
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
            module="routes"
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}

        {/* Modal de cadastro/edição */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-lg">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editando ? 'Editar Rota' : 'Nova Rota'}</DialogTitle>
              </DialogHeader>
              <div className="py-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                      <span className="text-lg">🔧</span>
                      <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent font-semibold">Método</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <Select value={form.method} onValueChange={(value) => setForm(f => ({ ...f, method: value }))}>
                      <SelectTrigger className="hover:border-sky-300 focus:border-sky-500 focus:ring-sky-100">
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                      <SelectContent>
                        {METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                      <span className="text-lg">🔗</span>
                      <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent font-semibold">Caminho</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={form.path}
                      onChange={e => setForm(f => ({ ...f, path: e.target.value }))}
                      disabled={formLoading}
                      className="hover:border-sky-300 focus:border-sky-500 focus:ring-sky-100"
                      placeholder="Ex: /usuarios"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent font-semibold">Nome da Rota</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    minLength={2}
                    disabled={formLoading}
                    autoFocus
                    className="hover:border-sky-300 focus:border-sky-500 focus:ring-sky-100"
                    placeholder="Ex: Listar Usuários"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">📦</span>
                    <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent font-semibold">Módulo</span>
                  </label>
                  <Select value={form.modulo} onValueChange={(value) => setForm(f => ({ ...f, modulo: value }))}>
                    <SelectTrigger className="hover:border-sky-300 focus:border-sky-500 focus:ring-sky-100">
                      <SelectValue placeholder="Selecione o módulo" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODULES.map((module) => (
                        <SelectItem key={module.value} value={module.value}>
                          {module.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">📄</span>
                    <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent font-semibold">Descrição</span>
                  </label>
                  <Textarea
                    value={form.descricao}
                    onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    disabled={formLoading}
                    className="hover:border-sky-300 focus:border-sky-500 focus:ring-sky-100"
                    placeholder="Descreva a funcionalidade desta rota"
                    rows={3}
                  />
                </div>

                {editando && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ativo"
                      checked={form.ativo}
                      onCheckedChange={(checked) => setForm(f => ({ ...f, ativo: checked }))}
                    />
                    <Label htmlFor="ativo">Rota ativa</Label>
                  </div>
                )}

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
                    Cancelar
                  </Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={formLoading}
                  className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
                >
                  {formLoading ? 'Salvando...' : 'Salvar'}
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
          title="Confirmar Exclusão de Rota"
          entityName={excluindo?.nome || ''}
          entityType="rota"
          isLoading={deleteLoading}
          loadingText="Excluindo rota..."
          confirmText="Excluir Rota"
        />
      </PageContainer>
  );
};

export default RoutesPage;