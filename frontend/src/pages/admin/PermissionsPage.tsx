import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Shield, Link, Unlink, Search, Filter, Settings } from 'lucide-react';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

import { rbacService } from '../../services/rbac';
import { Role, Route, AssignRouteToRoleRequest } from '../../types/RBAC';
import { ProtectedRoute } from '../../components/layout/ProtectedRoute';

interface RoleWithRoutes extends Role {
  assignedRoutes: Route[];
}

interface RouteWithRoles extends Route {
  assignedRoles: Role[];
}

const PermissionsPage: React.FC = () => {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [assignFormData, setAssignFormData] = useState({
    roleId: '',
    routeIds: [] as string[],
  });

  const queryClient = useQueryClient();

  // Queries
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rbacService.getRoles(true), // Apenas roles ativas
  });

  const { data: routes = [], isLoading: isLoadingRoutes } = useQuery({
    queryKey: ['routes'],
    queryFn: () => rbacService.getRoutes(true), // Apenas rotas ativas
  });

  // Hook para buscar todas as associações role-route
  const { data: allRoleRoutes = [] } = useQuery({
    queryKey: ['all-role-routes'],
    queryFn: () => rbacService.getAllRoleRoutes(),
    enabled: roles.length > 0 && routes.length > 0,
  });

  // Mapear roles com suas rotas
  const rolesWithRoutes: RoleWithRoutes[] = roles.map(role => {
    const roleRoutes = allRoleRoutes.filter(rr => rr.roleId === role.id);
    const assignedRoutes = routes.filter(route => 
      roleRoutes.some(rr => rr.routeId === route.id)
    );
    
    return { ...role, assignedRoutes };
  });

  // Agrupar rotas por módulo
  const routesByModule = routes.reduce((acc, route) => {
    const module = route.modulo || 'outros';
    if (!acc[module]) acc[module] = [];
    acc[module].push(route);
    return acc;
  }, {} as Record<string, Route[]>);

  const modules = Object.keys(routesByModule);

  // Mutations
  const assignMutation = useMutation({
    mutationFn: (data: AssignRouteToRoleRequest) => rbacService.assignRouteToRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-role-routes'] });
      toast.success('Permissão atribuída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atribuir permissão');
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ roleId, routeId }: { roleId: string; routeId: string }) => 
      rbacService.removeRouteFromRole(roleId, routeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-role-routes'] });
      setIsRemoveModalOpen(false);
      setSelectedRole(null);
      setSelectedRoute(null);
      toast.success('Permissão removida com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao remover permissão');
    },
  });

  const handleAssignMultiple = () => {
    setIsAssignModalOpen(true);
    setAssignFormData({ roleId: '', routeIds: [] });
  };

  const handleRemove = (role: Role, route: Route) => {
    setSelectedRole(role);
    setSelectedRoute(route);
    setIsRemoveModalOpen(true);
  };

  const handleSubmitAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Atribuir múltiplas rotas à role selecionada
    for (const routeId of assignFormData.routeIds) {
      await assignMutation.mutateAsync({
        roleId: assignFormData.roleId,
        routeId,
      });
    }
    
    setIsAssignModalOpen(false);
    setAssignFormData({ roleId: '', routeIds: [] });
  };

  const handleConfirmRemove = () => {
    if (!selectedRole || !selectedRoute) return;
    removeMutation.mutate({
      roleId: selectedRole.id,
      routeId: selectedRoute.id,
    });
  };

  const handleRouteToggle = (routeId: string, checked: boolean) => {
    setAssignFormData(prev => ({
      ...prev,
      routeIds: checked 
        ? [...prev.routeIds, routeId]
        : prev.routeIds.filter(id => id !== routeId)
    }));
  };

  const getMethodBadgeColor = (method: string) => {
    const colors = {
      'GET': 'bg-green-100 text-green-800',
      'POST': 'bg-blue-100 text-blue-800',
      'PUT': 'bg-yellow-100 text-yellow-800',
      'DELETE': 'bg-red-100 text-red-800',
    };
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const breadcrumbItems = [
    { label: 'Administração', href: '/admin' },
    { label: 'Permissões', href: '/admin/permissions' },
  ];

  return (
    <ProtectedRoute requiredModule="admin">
      <PageTemplate
        title="Gerenciar Permissões"
        description="Configure as permissões de acesso às rotas para cada role"
        breadcrumbItems={breadcrumbItems}
        icon={Settings}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Matriz de Permissões</h2>
              <p className="text-gray-600 mt-1">
                Configure quais rotas cada role pode acessar no sistema
              </p>
            </div>
            <Button onClick={handleAssignMultiple}>
              <Link className="w-4 h-4 mr-2" />
              Atribuir Permissões
            </Button>
          </div>

          <Tabs defaultValue="by-role" className="w-full">
            <TabsList>
              <TabsTrigger value="by-role">Por Role</TabsTrigger>
              <TabsTrigger value="by-route">Por Rota</TabsTrigger>
            </TabsList>

            {/* Visualização por Role */}
            <TabsContent value="by-role" className="space-y-6">
              {isLoadingRoles || isLoadingRoutes ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {[...Array(4)].map((_, j) => (
                            <div key={j} className="h-4 bg-gray-200 rounded"></div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {rolesWithRoutes.map((role) => (
                    <Card key={role.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-blue-600" />
                            <div>
                              <CardTitle>{role.nome}</CardTitle>
                              {role.descricao && (
                                <CardDescription>{role.descricao}</CardDescription>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary">
                            {role.assignedRoutes.length} permissões
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {role.assignedRoutes.length > 0 ? (
                          <div className="space-y-4">
                            {Object.entries(
                              role.assignedRoutes.reduce((acc, route) => {
                                const module = route.modulo || 'outros';
                                if (!acc[module]) acc[module] = [];
                                acc[module].push(route);
                                return acc;
                              }, {} as Record<string, Route[]>)
                            ).map(([module, moduleRoutes]) => (
                              <div key={module} className="space-y-2">
                                <h4 className="font-medium text-gray-700 capitalize">
                                  {module}
                                </h4>
                                <div className="grid gap-2 md:grid-cols-2">
                                  {moduleRoutes.map((route) => (
                                    <div
                                      key={route.id}
                                      className="flex items-center justify-between p-2 border rounded"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <Badge className={getMethodBadgeColor(route.method)}>
                                          {route.method}
                                        </Badge>
                                        <span className="text-sm">{route.nome}</span>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemove(role, route)}
                                        className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                                      >
                                        <Unlink className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-4">
                            Nenhuma permissão atribuída a esta role
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Visualização por Rota */}
            <TabsContent value="by-route" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar rotas..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={selectedModule} onValueChange={setSelectedModule}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filtrar por módulo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os módulos</SelectItem>
                        {modules.map((module) => (
                          <SelectItem key={module} value={module}>
                            {module}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {Object.entries(routesByModule)
                .filter(([module]) => selectedModule === 'all' || module === selectedModule)
                .map(([module, moduleRoutes]) => (
                  <Card key={module}>
                    <CardHeader>
                      <CardTitle className="capitalize flex items-center">
                        <Filter className="w-5 h-5 mr-2" />
                        {module}
                        <Badge variant="secondary" className="ml-2">
                          {moduleRoutes.length} rotas
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {moduleRoutes
                          .filter(route => 
                            !searchTerm || 
                            route.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            route.path.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((route) => (
                            <div
                              key={route.id}
                              className="flex items-center justify-between p-3 border rounded"
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
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500">
                                  {rolesWithRoutes.filter(role => 
                                    role.assignedRoutes.some(r => r.id === route.id)
                                  ).length} roles
                                </span>
                                <div className="flex space-x-1">
                                  {rolesWithRoutes
                                    .filter(role => 
                                      role.assignedRoutes.some(r => r.id === route.id)
                                    )
                                    .slice(0, 3)
                                    .map(role => (
                                      <Badge key={role.id} variant="outline" className="text-xs">
                                        {role.nome}
                                      </Badge>
                                    ))
                                  }
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Modal de Atribuir Permissões */}
        <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Atribuir Permissões</DialogTitle>
              <DialogDescription>
                Selecione uma role e as rotas que ela pode acessar
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitAssign}>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="roleId">Role *</Label>
                  <Select
                    value={assignFormData.roleId}
                    onValueChange={(value) => setAssignFormData(prev => ({ ...prev, roleId: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.nome}
                          {role.descricao && (
                            <span className="text-gray-500 text-xs ml-2">
                              - {role.descricao}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Rotas Disponíveis</Label>
                  <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                    {Object.entries(routesByModule).map(([module, moduleRoutes]) => (
                      <div key={module} className="mb-4">
                        <h4 className="font-medium text-gray-700 capitalize mb-2">
                          {module}
                        </h4>
                        <div className="space-y-2 ml-4">
                          {moduleRoutes.map((route) => (
                            <div key={route.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={route.id}
                                checked={assignFormData.routeIds.includes(route.id)}
                                onCheckedChange={(checked) => 
                                  handleRouteToggle(route.id, checked as boolean)
                                }
                              />
                              <label 
                                htmlFor={route.id} 
                                className="flex items-center space-x-2 cursor-pointer"
                              >
                                <Badge className={getMethodBadgeColor(route.method)}>
                                  {route.method}
                                </Badge>
                                <span className="text-sm">{route.nome}</span>
                                <span className="text-xs text-gray-400 font-mono">
                                  {route.path}
                                </span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {assignFormData.routeIds.length} rotas selecionadas
                  </p>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAssignModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={assignMutation.isPending || assignFormData.routeIds.length === 0}
                >
                  {assignMutation.isPending ? 'Atribuindo...' : 'Atribuir Permissões'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Remoção */}
        <AlertDialog open={isRemoveModalOpen} onOpenChange={setIsRemoveModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Permissão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a permissão da role "{selectedRole?.nome}" 
                para acessar a rota "{selectedRoute?.nome}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmRemove}
                disabled={removeMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {removeMutation.isPending ? 'Removendo...' : 'Remover'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageTemplate>
    </ProtectedRoute>
  );
};

export default PermissionsPage;