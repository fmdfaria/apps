import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Settings, 
  Camera, 
  Save,
  Edit3,
  Activity,
  Clock,
  CheckCircle,
  Users
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export const Perfil = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    telefone: '',
    endereco: '',
    bio: ''
  });

  if (!user) {
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

  // Função para obter cor do badge baseado no tipo de usuário
  const getUserTypeColor = (tipo: string) => {
    const colors = {
      'ADMIN': 'bg-red-500',
      'RECEPCIONISTA': 'bg-blue-500',
      'PROFISSIONAL': 'bg-green-500',
      'PACIENTE': 'bg-purple-500'
    };
    return colors[tipo as keyof typeof colors] || 'bg-gray-500';
  };

  // Função para obter texto amigável do tipo de usuário
  const getUserTypeLabel = (tipo: string) => {
    const labels = {
      'ADMIN': 'Administrador',
      'RECEPCIONISTA': 'Recepcionista',
      'PROFISSIONAL': 'Profissional',
      'PACIENTE': 'Paciente'
    };
    return labels[tipo as keyof typeof labels] || tipo;
  };

  const handleSave = () => {
    // TODO: Implementar salvamento dos dados
    console.log('Salvando dados:', formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      nome: user?.nome || '',
      email: user?.email || '',
      telefone: '',
      endereco: '',
      bio: ''
    });
    setIsEditing(false);
  };

  // Dados mockados para estatísticas
  const estatisticas = [
    { label: 'Agendamentos', value: '127', icon: Calendar, color: 'text-blue-600' },
    { label: 'Atendimentos', value: '89', icon: CheckCircle, color: 'text-green-600' },
    { label: 'Horas Trabalhadas', value: '340h', icon: Clock, color: 'text-orange-600' },
    { label: 'Pacientes', value: '56', icon: Users, color: 'text-purple-600' },
  ];

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
                      <AvatarFallback 
                        className={cn(
                          'text-white text-xl font-semibold',
                          getUserTypeColor(user.tipo)
                        )}
                      >
                        {getInitials(user.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                    >
                      <Camera className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Nome e Tipo */}
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{user.nome}</h2>
                  <Badge 
                    className={cn(
                      'mb-3 text-white',
                      getUserTypeColor(user.tipo)
                    )}
                  >
                    {getUserTypeLabel(user.tipo)}
                  </Badge>

                  {/* Email */}
                  <div className="flex items-center text-gray-600 mb-4">
                    <Mail className="w-4 h-4 mr-2" />
                    <span className="text-sm">{user.email}</span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Ativo</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Estatísticas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {estatisticas.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={cn('w-4 h-4', stat.color)} />
                        <span className="text-sm text-gray-600">{stat.label}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{stat.value}</span>
                    </div>
                  );
                })}
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
                  <Button
                    variant={isEditing ? "outline" : "default"}
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    {isEditing ? 'Cancelar' : 'Editar'}
                  </Button>
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

                  {/* Telefone */}
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                        disabled={!isEditing}
                        className="pl-10"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="space-y-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                        disabled={!isEditing}
                        className="pl-10"
                        placeholder="Seu endereço"
                      />
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Biografia</Label>
                  <textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    disabled={!isEditing}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Conte um pouco sobre você..."
                  />
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
                      <span className="ml-2 text-gray-900">{getUserTypeLabel(user.tipo)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className="ml-2 text-green-600">Ativo</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Última Atualização:</span>
                      <span className="ml-2 text-gray-900">Hoje, 14:30</span>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                {isEditing && (
                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSave} className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </Button>
                    <Button variant="outline" onClick={handleCancel} className="flex-1">
                      Cancelar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}; 