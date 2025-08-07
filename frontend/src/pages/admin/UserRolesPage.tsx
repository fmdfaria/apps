import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users, UserPlus, UserMinus, Search, Filter } from 'lucide-react';

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
import { Avatar, AvatarFallback } from '../../components/ui/avatar';

import { rbacService } from '../../services/rbac';
import { usersService } from '../../services/users';
import { Role, AssignRoleToUserRequest } from '../../types/RBAC';
import { User } from '../../types/User';
import { ProtectedRoute } from '../../components/layout/ProtectedRoute';

interface UserWithRoles extends User {
  userRoles: Role[];
}

const UserRolesPage: React.FC = () => {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [assignFormData, setAssignFormData] = useState({
    userId: '',
    roleId: '',
  });

  const queryClient = useQueryClient();

  // Queries
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getUsers(),
  });

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rbacService.getRoles(true), // Apenas roles ativas
  });

  // Hook para buscar roles dos usuários
  const { data: allUserRoles = [] } = useQuery({
    queryKey: ['all-user-roles'],
    queryFn: () => rbacService.getAllUserRoles(),
    enabled: users.length > 0,
  });

  // Mapear usuários com suas roles
  const usersWithRoles: UserWithRoles[] = users.map(user => {
    // Filtrar user roles do usuário atual
    const userRoleIds = allUserRoles
      .filter(ur => ur.userId === user.id && ur.ativo)
      .map(ur => ur.roleId);
    
    // Buscar as roles correspondentes
    const userRoles = roles.filter(role => userRoleIds.includes(role.id));
    
    return { ...user, userRoles };
  });

  // Filtrar usuários
  const filteredUsers = usersWithRoles.filter((user) => {
    const matchesSearch = 
      user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRoleFilter === 'all' || 
      user.userRoles.some(role => role.id === selectedRoleFilter);
    
    return matchesSearch && matchesRole;
  });

  // Mutations
  const assignMutation = useMutation({
    mutationFn: (data: AssignRoleToUserRequest) => rbacService.assignRoleToUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      setIsAssignModalOpen(false);
      resetForm();
      toast.success('Role atribuída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atribuir role');
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => 
      rbacService.removeRoleFromUser(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      setIsRemoveModalOpen(false);
      setSelectedUser(null);
      setSelectedRole(null);
      toast.success('Role removida com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao remover role');
    },
  });

  const resetForm = () => {
    setAssignFormData({
      userId: '',
      roleId: '',
    });
    setSelectedUser(null);
    setSelectedRole(null);
  };

  const handleAssign = (user?: User) => {
    if (user) {
      setAssignFormData(prev => ({ ...prev, userId: user.id }));
    }
    setIsAssignModalOpen(true);
  };

  const handleRemove = (user: User, role: Role) => {
    setSelectedUser(user);
    setSelectedRole(role);
    setIsRemoveModalOpen(true);
  };

  const handleSubmitAssign = (e: React.FormEvent) => {
    e.preventDefault();
    assignMutation.mutate({
      userId: assignFormData.userId,
      roleId: assignFormData.roleId,
    });
  };

  const handleConfirmRemove = () => {
    if (!selectedUser || !selectedRole) return;
    removeMutation.mutate({
      userId: selectedUser.id,
      roleId: selectedRole.id,
    });
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getUserTypeColor = (tipo: string) => {
    const colors = {
      'ADMIN': 'bg-red-500',
      'RECEPCIONISTA': 'bg-blue-500',
      'PROFISSIONAL': 'bg-green-500',
      'PACIENTE': 'bg-purple-500'
    };
    return colors[tipo as keyof typeof colors] || 'bg-gray-500';
  };

  const breadcrumbItems = [
    { label: 'Administração', href: '/admin' },
    { label: 'Usuários e Roles', href: '/admin/user-roles' },
  ];

  return (
    <ProtectedRoute requiredModule="admin">
      <PageTemplate
        title="Usuários e Roles"
        description="Gerencie a atribuição de roles aos usuários do sistema"
        breadcrumbItems={breadcrumbItems}
        icon={Users}
      >
        <div className="space-y-6">
          {/* Header com filtros */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Gestão de Usuários e Roles</h2>
              <p className="text-gray-600 mt-1">
                Atribua e gerencie as roles dos usuários do sistema
              </p>
            </div>
            <Button onClick={() => handleAssign()}>
              <UserPlus className="w-4 h-4 mr-2" />
              Atribuir Role
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
                      placeholder="Buscar usuários por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as roles</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de usuários */}
          {isLoadingUsers || isLoadingRoles ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="flex space-x-2">
                          <div className="h-6 bg-gray-200 rounded w-16"></div>
                          <div className="h-6 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className={`text-white ${getUserTypeColor(user.tipo)}`}>
                            {getInitials(user.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{user.nome}</h3>
                          <p className="text-sm text-gray-500 mb-2">{user.email}</p>
                          <Badge variant="outline" className="mb-3">
                            {user.tipo}
                          </Badge>
                          
                          {/* Roles do usuário */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">
                              Roles ({user.userRoles.length})
                            </h4>
                            {user.userRoles.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {user.userRoles.map((role) => (
                                  <div key={role.id} className="flex items-center">
                                    <Badge variant="secondary" className="mr-1">
                                      {role.nome}
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemove(user, role)}
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                    >
                                      <UserMinus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">Nenhuma role atribuída</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssign(user)}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum usuário encontrado
                </h3>
                <p className="text-gray-500 text-center">
                  {searchTerm || selectedRoleFilter !== 'all' 
                    ? 'Tente ajustar os filtros de pesquisa' 
                    : 'Não há usuários cadastrados no sistema'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Modal de Atribuir Role */}
        <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atribuir Role a Usuário</DialogTitle>
              <DialogDescription>
                Selecione o usuário e a role que deseja atribuir
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitAssign}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="userId">Usuário *</Label>
                  <Select
                    value={assignFormData.userId}
                    onValueChange={(value) => setAssignFormData(prev => ({ ...prev, userId: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.nome} - {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  disabled={assignMutation.isPending}
                >
                  {assignMutation.isPending ? 'Atribuindo...' : 'Atribuir Role'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Remoção */}
        <AlertDialog open={isRemoveModalOpen} onOpenChange={setIsRemoveModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Role</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a role "{selectedRole?.nome}" do usuário "{selectedUser?.nome}"?
                Esta ação pode afetar o acesso do usuário ao sistema.
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

export default UserRolesPage;