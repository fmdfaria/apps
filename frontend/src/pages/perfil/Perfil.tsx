import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Settings, 
  Camera, 
  Save,
  Edit3,
  Key
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import AlterarSenhaModal from '@/components/AlterarSenhaModal';
import { whatsAppFromStorage } from '@/utils/whatsapp';
import { updateUser, getUserById, getUserRoles } from '@/services/users';
import { uploadAvatar } from '@/services/avatar';
import { AppToast } from '@/services/toast';
import { cn } from '@/lib/utils';

export const Perfil = () => {
  const { user, setUser } = useAuth();
  const { hasPermission } = usePermissions();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Verificar se o usuário pode editar seu próprio perfil
  const canEditProfile = user?.id ? hasPermission(`/users/${user.id}`, 'PUT') : false;
  const [formData, setFormData] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    whatsapp: user?.whatsapp || '',
  });

  // Função para carregar dados atualizados do usuário
  const loadUserProfile = async () => {
    if (!user?.id) return;
    
    setIsLoadingProfile(true);
    try {
      // Buscar dados do usuário e roles em paralelo
      const [updatedUser, userRoles] = await Promise.all([
        getUserById(user.id),
        getUserRoles(user.id)
      ]);

      // Combinar dados do usuário com roles
      const userWithRoles = { ...updatedUser, roles: userRoles };
      
      setUser(userWithRoles);
      setFormData({
        nome: userWithRoles.nome,
        email: userWithRoles.email,
        whatsapp: userWithRoles.whatsapp || '',
      });
    } catch (error: any) {
      console.error('Erro ao carregar perfil do usuário:', error);
      AppToast.error('Erro ao carregar perfil', {
        description: 'Não foi possível carregar os dados atualizados do perfil'
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Carregar dados do usuário ao montar o componente
  useEffect(() => {
    loadUserProfile();
  }, [user?.id]); // Recarregar se o ID do usuário mudar

  if (!user || isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  // Função para gerar iniciais do nome
  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  // Função para obter cor do badge baseado nas roles do usuário
  const getUserTypeColor = (roles: string[] | undefined) => {
    if (!roles || !Array.isArray(roles)) return 'bg-gray-500';
    if (roles.includes('ADMIN')) return 'bg-red-500';
    if (roles.includes('PROFISSIONAL')) return 'bg-green-500';
    if (roles.includes('RECEPCIONISTA')) return 'bg-blue-500';
    if (roles.includes('PACIENTE')) return 'bg-purple-500';
    return 'bg-gray-500';
  };

  // Função para obter texto amigável do tipo de usuário
  const getUserTypeLabel = (roles: string[] | undefined) => {
    if (!roles || !Array.isArray(roles)) return 'Usuário';
    if (roles.includes('ADMIN')) return 'Administrador';
    if (roles.includes('PROFISSIONAL')) return 'Profissional';
    if (roles.includes('RECEPCIONISTA')) return 'Recepcionista';
    if (roles.includes('PACIENTE')) return 'Paciente';
    return roles.join(', ') || 'Usuário';
  };

  const handleSave = async () => {
    if (!user) return;

    // Verificar permissão antes de prosseguir
    if (!canEditProfile) {
      AppToast.error('Acesso negado', {
        description: 'Você não tem permissão para editar este perfil'
      });
      setIsEditing(false);
      return;
    }

    // Validações básicas
    if (!formData.nome.trim()) {
      AppToast.error('Nome é obrigatório');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      AppToast.error('Email inválido');
      return;
    }

    setIsSaving(true);
    try {
      // Preparar dados para atualização (apenas campos que mudaram)
      const updateData: any = {};
      if (formData.nome !== user.nome) updateData.nome = formData.nome.trim();
      if (formData.email !== user.email) updateData.email = formData.email.trim();
      if (formData.whatsapp !== user.whatsapp) updateData.whatsapp = formData.whatsapp;

      // Se não há mudanças, apenas sair do modo de edição
      if (Object.keys(updateData).length === 0) {
        setIsEditing(false);
        AppToast.info('Nenhuma alteração detectada');
        return;
      }

      // Fazer a chamada para o backend
      await updateUser(user.id, updateData);

      // Atualizar o usuário no estado global
      const updatedUser = { ...user, ...updateData };
      setUser(updatedUser);

      setIsEditing(false);
      AppToast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Erro ao salvar perfil';
      AppToast.error('Erro ao salvar', {
        description: errorMessage
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      nome: user?.nome || '',
      email: user?.email || '',
      whatsapp: user?.whatsapp || '',
    });
    setIsEditing(false);
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validações no frontend
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      AppToast.error('Tipo de arquivo inválido', { 
        description: 'Apenas JPG, PNG e WebP são permitidos.' 
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      AppToast.error('Arquivo muito grande', { 
        description: 'Tamanho máximo: 5MB.' 
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const response = await uploadAvatar(file);
      
      // Atualizar o usuário no estado global
      if (user) {
        const updatedUser = { ...user, avatarUrl: response.avatarUrl };
        setUser(updatedUser);
      }

      AppToast.success('Avatar atualizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao fazer upload do avatar:', error);
      AppToast.error('Erro ao atualizar avatar', {
        description: error?.response?.data?.message || 'Tente novamente.'
      });
    } finally {
      setIsUploadingAvatar(false);
      // Limpar o input file
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-600">Gerencie suas informações pessoais e configurações</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda - Informações do Perfil */}
          <div className="lg:col-span-1 space-y-6">
            {/* Card de Perfil Principal */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  <div className="relative mb-4">
                    <Avatar className="w-24 h-24">
                      {user.avatarUrl ? (
                        <AvatarImage src={user.avatarUrl} alt={user.nome} />
                      ) : null}
                      <AvatarFallback 
                        className={cn(
                          'text-white text-xl font-semibold',
                          getUserTypeColor(user.roles || [])
                        )}
                      >
                        {getInitials(user.nome)}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Input file oculto */}
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    
                    {/* Botão de upload */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={isUploadingAvatar}
                      title="Alterar avatar"
                    >
                      {isUploadingAvatar ? (
                        <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-3 h-3" />
                      )}
                    </Button>
                  </div>

                  {/* Nome e Tipo */}
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{user.nome}</h2>
                  <Badge 
                    className={cn(
                      'mb-3 text-white',
                      getUserTypeColor(user.roles || [])
                    )}
                  >
                    {getUserTypeLabel(user.roles || [])}
                  </Badge>

                  {/* Email */}
                  <div className="flex items-center text-gray-600 mb-2">
                    <Mail className="w-4 h-4 mr-2" />
                    <span className="text-sm">{user.email}</span>
                  </div>

                  {/* WhatsApp */}
                  {user.whatsapp ? (
                    <div className="flex items-center text-gray-600 mb-4">
                      <Phone className="w-4 h-4 mr-2" />
                      <span className="text-sm">{whatsAppFromStorage(user.whatsapp)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-gray-400 mb-4">
                      <Phone className="w-4 h-4 mr-2" />
                      <span className="text-sm italic">WhatsApp não informado</span>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${user.ativo ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-gray-600">{user.ativo ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Coluna Direita - Formulário de Edição */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Informações Pessoais
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleChangePassword}
                      className="flex items-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      Alterar Senha
                    </Button>
                    <div
                      className="inline-block"
                      title={!canEditProfile && !isEditing ? 'Acesso restrito: Você não tem permissão para editar. Entre em contato com o administrador se necessário.' : undefined}
                    >
                      <Button
                        variant={isEditing ? "outline" : "default"}
                        onClick={() => setIsEditing(!isEditing)}
                        disabled={!canEditProfile && !isEditing}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        {isEditing ? 'Cancelar' : 'Editar'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome Completo */}
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="whatsapp"
                        value={formData.whatsapp ? whatsAppFromStorage(formData.whatsapp) : ''}
                        onChange={(e) => {
                          // Remove formatação e mantém apenas números
                          const cleanValue = e.target.value.replace(/\D/g, '');
                          setFormData(prev => ({ ...prev, whatsapp: cleanValue }));
                        }}
                        disabled={!isEditing}
                        className="pl-10"
                        placeholder="+55 (11) 99999-9999"
                      />
                    </div>
                  </div>
                </div>

                {/* Informações do Sistema */}
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Informações do Sistema
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">ID do Usuário:</span>
                      <span className="ml-2 font-mono text-gray-900">{user.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Tipo de Conta:</span>
                      <span className="ml-2 text-gray-900">{getUserTypeLabel(user.roles || [])}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className={`ml-2 ${user.ativo ? 'text-green-600' : 'text-red-600'}`}>
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Primeiro Login:</span>
                      <span className={`ml-2 ${user.primeiroLogin ? 'text-green-600' : 'text-orange-600'}`}>
                        {user.primeiroLogin ? 'Concluído' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                {isEditing && (
                  <div className="flex gap-3 pt-4">
                    <div
                      className="flex-1"
                      title={!canEditProfile ? 'Acesso restrito: Você não tem permissão para editar este perfil' : undefined}
                    >
                      <Button 
                        onClick={handleSave} 
                        disabled={isSaving || !canEditProfile}
                        className="w-full"
                      >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar Alterações
                        </>
                      )}
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleCancel} 
                      disabled={isSaving}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de Alterar Senha */}
      <AlterarSenhaModal 
        open={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </div>
  );
}; 