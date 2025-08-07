import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Route as RouteIcon, Filter, Search } from 'lucide-react';

import { PageTemplate } from '../../components/layout/PageTemplate';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

import { rbacService } from '../../services/rbac';
import { Route, CreateRouteRequest, UpdateRouteRequest } from '../../types/RBAC';
import { ProtectedRoute } from '../../components/layout/ProtectedRoute';

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
  { value: 'recursos', label: 'Recursos' },
  { value: 'especialidades', label: 'Especialidades' },
  { value: 'conselhos', label: 'Conselhos' },
  { value: 'admin', label: 'Administração' },
  { value: 'relatorios', label: 'Relatórios' },
];

const METHODS = [
  { value: 'GET', label: 'GET', color: 'bg-green-100 text-green-800' },
  { value: 'POST', label: 'POST', color: 'bg-blue-100 text-blue-800' },
  { value: 'PUT', label: 'PUT', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'DELETE', label: 'DELETE', color: 'bg-red-100 text-red-800' },
];

const RoutesPage: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [formData, setFormData] = useState<RouteFormData>({
    path: '',
    method: 'GET',
    nome: '',
    descricao: '',
    modulo: 'dashboard',
    ativo: true,
  });

  const queryClient = useQueryClient();

  // Query para buscar rotas
  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: () => rbacService.getRoutes(),
  });

  // Filtrar rotas
  const filteredRoutes = routes.filter((route) => {
    const matchesSearch = 
      route.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.path.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = selectedModule === 'all' || route.modulo === selectedModule;
    return matchesSearch && matchesModule;
  });

  // Agrupar por módulo
  const routesByModule = filteredRoutes.reduce((acc, route) => {
    const module = route.modulo || 'outros';
    if (!acc[module]) acc[module] = [];
    acc[module].push(route);
    return acc;
  }, {} as Record<string, Route[]>);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateRouteRequest) => rbacService.createRoute(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setIsCreateModalOpen(false);
      resetForm();
      toast.success('Rota criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar rota');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRouteRequest }) => 
      rbacService.updateRoute(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setIsEditModalOpen(false);
      resetForm();
      toast.success('Rota atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar rota');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rbacService.deleteRoute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setIsDeleteModalOpen(false);
      setSelectedRoute(null);
      toast.success('Rota deletada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao deletar rota');
    },
  });

  const resetForm = () => {
    setFormData({
      path: '',
      method: 'GET',
      nome: '',
      descricao: '',
      modulo: 'dashboard',
      ativo: true,
    });
    setSelectedRoute(null);
  };

  const handleCreate = () => {
    setIsCreateModalOpen(true);
    resetForm();
  };

  const handleEdit = (route: Route) => {
    setSelectedRoute(route);
    setFormData({
      path: route.path,
      method: route.method,
      nome: route.nome,
      descricao: route.descricao || '',
      modulo: route.modulo || 'dashboard',
      ativo: route.ativo,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (route: Route) => {
    setSelectedRoute(route);
    setIsDeleteModalOpen(true);
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      path: formData.path,
      method: formData.method,
      nome: formData.nome,
      descricao: formData.descricao || undefined,
      modulo: formData.modulo || undefined,
    });
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute) return;
    
    updateMutation.mutate({
      id: selectedRoute.id,
      data: {
        path: formData.path,
        method: formData.method,
        nome: formData.nome,
        descricao: formData.descricao || undefined,
        modulo: formData.modulo || undefined,
        ativo: formData.ativo,
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!selectedRoute) return;
    deleteMutation.mutate(selectedRoute.id);
  };

  const getMethodBadgeColor = (method: string) => {
    const methodConfig = METHODS.find(m => m.value === method);
    return methodConfig?.color || 'bg-gray-100 text-gray-800';
  };

  const breadcrumbItems = [
    { label: 'Administração', href: '/admin' },
    { label: 'Rotas', href: '/admin/routes' },
  ];

  return (
    <ProtectedRoute requiredModule="admin">
      <PageTemplate
        title="Gerenciar Rotas"
        description="Gerencie as rotas do frontend para controle de acesso"
        breadcrumbItems={breadcrumbItems}
        icon={RouteIcon}
      >
        <div className="space-y-6">
          {/* Header com filtros e botão criar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Rotas do Sistema</h2>
              <p className="text-gray-600 mt-1">
                Cadastre e gerencie as rotas do frontend para controle de permissões
              </p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Rota
            </Button>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nome ou path..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <Select value={selectedModule} onValueChange={setSelectedModule}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por módulo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os módulos</SelectItem>
                      {MODULES.map((module) => (
                        <SelectItem key={module.value} value={module.value}>
                          {module.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de rotas agrupadas por módulo */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[...Array(2)].map((_, j) => (
                        <div key={j} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center space-x-3">
                            <div className="h-6 bg-gray-200 rounded w-16"></div>
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                          </div>
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : Object.keys(routesByModule).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(routesByModule).map(([module, moduleRoutes]) => (
                <Card key={module}>
                  <CardHeader>
                    <CardTitle className="text-lg capitalize flex items-center">
                      <Filter className="w-5 h-5 mr-2 text-blue-600" />
                      {MODULES.find(m => m.value === module)?.label || module}
                      <Badge variant="secondary" className="ml-2">
                        {moduleRoutes.length} {moduleRoutes.length === 1 ? 'rota' : 'rotas'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {moduleRoutes.map((route) => (
                        <div
                          key={route.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-3">
                            <Badge className={getMethodBadgeColor(route.method)}>
                              {route.method}
                            </Badge>
                            <div>
                              <div className="font-medium">{route.nome}</div>
                              <div className="text-sm text-gray-500 font-mono">
                                {route.path}
                              </div>
                              {route.descricao && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {route.descricao}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={route.ativo ? "default" : "secondary"}>
                              {route.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(route)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(route)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <RouteIcon className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma rota encontrada
                </h3>
                <p className="text-gray-500 text-center mb-4">
                  {searchTerm || selectedModule !== 'all' 
                    ? 'Tente ajustar os filtros de pesquisa' 
                    : 'Comece criando a primeira rota do sistema'
                  }
                </p>
                {!searchTerm && selectedModule === 'all' && (
                  <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar primeira rota
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Modal de Criar Rota */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Rota</DialogTitle>
              <DialogDescription>
                Cadastre uma nova rota do frontend para controle de permissões
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitCreate}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="path">Path da Rota *</Label>
                    <Input
                      id="path"
                      value={formData.path}
                      onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
                      placeholder="/pacientes/lista"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="method">Método HTTP *</Label>
                    <Select
                      value={formData.method}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome da Rota *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Lista de Pacientes"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="modulo">Módulo</Label>
                    <Select
                      value={formData.modulo}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, modulo: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descreva o que esta rota permite acessar"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Criando...' : 'Criar Rota'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de Editar Rota */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Rota</DialogTitle>
              <DialogDescription>
                Modifique as informações da rota selecionada
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitEdit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-path">Path da Rota *</Label>
                    <Input
                      id="edit-path"
                      value={formData.path}
                      onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-method">Método HTTP *</Label>
                    <Select
                      value={formData.method}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-nome">Nome da Rota *</Label>
                    <Input
                      id="edit-nome"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-modulo">Módulo</Label>
                    <Select
                      value={formData.modulo}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, modulo: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                </div>
                <div>
                  <Label htmlFor="edit-descricao">Descrição</Label>
                  <Textarea
                    id="edit-descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                  />
                  <Label htmlFor="edit-ativo">Rota ativa</Label>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Exclusão */}
        <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a rota "{selectedRoute?.nome}"? 
                Esta ação não pode ser desfeita e pode afetar o controle de acesso do sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageTemplate>
    </ProtectedRoute>
  );
};

export default RoutesPage;