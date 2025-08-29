import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  Clock,
  Plus,
  Search,
  Users,
  Activity,
  LayoutGrid,
  List,
  Eye,
  Edit,
  Trash2,
  RotateCcw
} from 'lucide-react';
import type { FilaEspera, HorarioPreferencia } from '@/types/FilaEspera';
import { 
  getFilaEspera,
  createFilaEspera,
  updateFilaEspera,
  deleteFilaEspera,
  toggleFilaEsperaStatus
} from '@/services/fila-espera';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import FilaEsperaModal from './FilaEsperaModal';
import FilaEsperaViewModal from './FilaEsperaViewModal';
import { AppToast } from '@/services/toast';
import api from '@/services/api';
import { formatarDataHoraLocal } from '@/utils/dateUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const HORA_LABEL: Record<HorarioPreferencia, string> = {
  'MANHÃ': 'Manhã',
  'TARDE': 'Tarde',
  'NOITE': 'Noite',
};

const getHorarioColor = (horario: HorarioPreferencia) => {
  const cores = {
    'MANHÃ': 'bg-yellow-100 text-yellow-700',
    'TARDE': 'bg-orange-100 text-orange-700', 
    'NOITE': 'bg-blue-100 text-blue-700'
  };
  return cores[horario] || 'bg-gray-100 text-gray-700';
};

const getStatusColor = (status: string) => {
  const cores = {
    'pendente': 'bg-orange-100 text-orange-700',
    'agendado': 'bg-green-100 text-green-700',
    'cancelado': 'bg-red-100 text-red-700',
    'finalizado': 'bg-gray-100 text-gray-700'
  };
  return cores[status] || 'bg-gray-100 text-gray-700';
};

export default function FilaEsperaPage() {
  const [items, setItems] = useState<FilaEspera[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('tabela');
  
  
  // Estados para controle de permissões RBAC
  const [accessDenied, setAccessDenied] = useState(false);
  const [canRead, setCanRead] = useState(true);
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [canToggleStatus, setCanToggleStatus] = useState(true);

  // Estados para modais
  const [showDetalhesItem, setShowDetalhesItem] = useState(false);
  const [itemDetalhes, setItemDetalhes] = useState<FilaEspera | null>(null);
  
  const [showEditarItem, setShowEditarItem] = useState(false);
  const [itemEdicao, setItemEdicao] = useState<FilaEspera | null>(null);
  
  const [showFilaEsperaModal, setShowFilaEsperaModal] = useState(false);

  // Estados para exclusão
  const [itemExcluindo, setItemExcluindo] = useState<FilaEspera | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [initialized, setInitialized] = useState(false);

  // Inicialização única
  useEffect(() => {
    const init = async () => {
      await checkPermissions();
      await carregarItens();
      setInitialized(true);
    };
    init();
  }, []);

  // Debounce da busca para evitar muitas chamadas à API
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(busca);
    }, 500); // 500ms de debounce
    
    return () => clearTimeout(timer);
  }, [busca]);
  
  // Recarregamento quando dependências mudam (mas apenas após inicialização)
  useEffect(() => {
    if (initialized) {
      carregarItens();
    }
  }, [buscaDebounced]);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar cada permissão específica para fila de espera
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/fila-de-espera' && route.method.toLowerCase() === 'get';
      });
      
      const canCreate = allowedRoutes.some((route: any) => {
        return route.path === '/fila-de-espera' && route.method.toLowerCase() === 'post';
      });
      
      const canUpdate = allowedRoutes.some((route: any) => {
        return route.path === '/fila-de-espera/:id' && route.method.toLowerCase() === 'put';
      });
      
      const canDelete = allowedRoutes.some((route: any) => {
        return route.path === '/fila-de-espera/:id' && route.method.toLowerCase() === 'delete';
      });

      const canToggleStatus = allowedRoutes.some((route: any) => {
        return route.path === '/fila-de-espera/:id/status' && route.method.toLowerCase() === 'patch';
      });
      
      setCanRead(canRead);
      setCanCreate(canCreate);
      setCanUpdate(canUpdate);
      setCanDelete(canDelete);
      setCanToggleStatus(canToggleStatus);
      
      // Se não tem nem permissão de leitura, marca como access denied
      if (!canRead) {
        setAccessDenied(true);
      }
      
    } catch (error: any) {
      // Em caso de erro, desabilita tudo por segurança
      setCanRead(false);
      setCanCreate(false);
      setCanUpdate(false);
      setCanDelete(false);
      setCanToggleStatus(false);
      
      // Se retornar 401/403 no endpoint de permissões, considera acesso negado
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };


  const carregarItens = async () => {
    if (!canRead) {
      setAccessDenied(true);
      return;
    }
    
    setLoading(true);
    setAccessDenied(false);
    try {
      const data = await getFilaEspera();
      setItems(data);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setAccessDenied(true);
      } else {
        AppToast.error('Erro ao carregar fila de espera', {
          description: 'Ocorreu um problema ao carregar a lista da fila de espera. Tente novamente.'
        });
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar itens baseado na busca
  const itensFiltrados = busca 
    ? items.filter(item => 
        item.pacienteNome?.toLowerCase().includes(busca.toLowerCase()) ||
        item.servicoNome?.toLowerCase().includes(busca.toLowerCase()) ||
        item.profissionalNome?.toLowerCase().includes(busca.toLowerCase()) ||
        item.observacao?.toLowerCase().includes(busca.toLowerCase()) ||
        item.status?.toLowerCase().includes(busca.toLowerCase()) ||
        HORA_LABEL[item.horarioPreferencia].toLowerCase().includes(busca.toLowerCase()) ||
        item.pacienteId.toLowerCase().includes(busca.toLowerCase())
      )
    : items;

  const formatarDataHora = formatarDataHoraLocal;

  const handleVerDetalhes = (item: FilaEspera) => {
    console.log('Clicou no botão olho, item:', item);
    setItemDetalhes(item);
    setShowDetalhesItem(true);
    console.log('Estados definidos - showDetalhesItem: true');
  };

  const handleEditarItem = (item: FilaEspera) => {
    setItemEdicao(item);
    setShowFilaEsperaModal(true);
  };

  const handleAbrirNovoItem = () => {
    setItemEdicao(null);
    setShowFilaEsperaModal(true);
  };

  const handleSuccessModal = () => {
    carregarItens();
    setShowFilaEsperaModal(false);
    setItemEdicao(null);
  };

  const handleFecharModal = () => {
    setShowFilaEsperaModal(false);
    setItemEdicao(null);
  };

  // Funções de exclusão
  const confirmarExclusao = async (item: FilaEspera) => {
    setItemExcluindo(item);
  };

  const cancelarExclusao = () => {
    setItemExcluindo(null);
  };

  const handleDelete = async () => {
    if (!itemExcluindo) return;
    
    setDeleteLoading(true);
    try {
      await deleteFilaEspera(itemExcluindo.id);
      setItemExcluindo(null);
      carregarItens(); // Recarregar a lista após exclusão
      AppToast.success('Item removido da fila de espera');
    } catch (error: any) {
      console.error('Erro ao excluir item:', error);
      const errorMessage = error?.response?.data?.message || 'Erro ao remover item';
      AppToast.error('Erro ao remover item', {
        description: errorMessage
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleStatus = async (item: FilaEspera) => {
    try {
      await toggleFilaEsperaStatus(item.id, !item.ativo);
      carregarItens();
      AppToast.success(`Item ${!item.ativo ? 'ativado' : 'desativado'} com sucesso`);
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      const errorMessage = error?.response?.data?.message || 'Erro ao alterar status do item';
      AppToast.error('Erro ao alterar status', {
        description: errorMessage
      });
    }
  };

  const renderCardView = () => (
    <div className="space-y-6">
      {/* Cards dos Itens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {itensFiltrados.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
            <Activity className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhum item encontrado
            </h3>
            <p className="text-sm">
              {busca 
                ? 'Tente alterar os filtros de busca.' 
                : 'Comece adicionando um item à fila de espera.'
              }
            </p>
          </div>
        ) : (
          itensFiltrados.map(item => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(item.pacienteNome || 'P')?.charAt(0).toUpperCase()}
                    </div>
                    <CardTitle className="text-sm font-medium truncate">
                      {item.pacienteNome || `ID: ${item.pacienteId}`}
                    </CardTitle>
                  </div>
                  <Badge className={`text-xs flex-shrink-0 ml-2 ${getStatusColor(item.status || 'pendente')}`}>
                    {item.status || 'pendente'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-3 pb-3">
                <div className="space-y-1 mb-3">
                  {item.createdAt && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="text-lg">📅</span>
                      <span className="truncate">Criado: {formatarDataHora(item.createdAt).data}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span className="truncate">Horário: {HORA_LABEL[item.horarioPreferencia]}</span>
                  </div>
                  {item.servicoNome && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="text-lg">🩺</span>
                      <span className="truncate">Serviço: {item.servicoNome}</span>
                    </div>
                  )}
                  {item.profissionalNome && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="text-lg">👨‍⚕️</span>
                      <span className="truncate">Profissional: {item.profissionalNome}</span>
                    </div>
                  )}
                  {item.observacao && (
                    <div className="text-xs text-gray-500 truncate">
                      💬 {item.observacao}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant={item.ativo ? "default" : "secondary"} className="text-xs px-1 py-0">
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex gap-1.5">
                  {canRead ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                      onClick={() => handleVerDetalhes(item)}
                      title="Visualizar Item"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="default"
                            size="sm"
                            disabled={true}
                            className="bg-gray-400 cursor-not-allowed h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Você não tem permissão para visualizar itens</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {canUpdate ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="group border-2 border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                      onClick={() => handleEditarItem(item)}
                      title="Editar Item"
                    >
                      <Edit className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={true}
                            className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Você não tem permissão para editar itens</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {canToggleStatus ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="group border-2 border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white hover:border-orange-600 focus:ring-4 focus:ring-orange-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                      onClick={() => handleToggleStatus(item)}
                      title={item.ativo ? "Desativar Item" : "Ativar Item"}
                    >
                      <RotateCcw className="w-4 h-4 text-orange-600 group-hover:text-white transition-colors" />
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={true}
                            className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Você não tem permissão para alterar status</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {canDelete ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="group border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-4 focus:ring-red-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                      onClick={() => confirmarExclusao(item)}
                      title="Excluir Item"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 group-hover:text-white transition-colors" />
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={true}
                            className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Você não tem permissão para excluir itens</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderTableView = () => (
    <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-100">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                Paciente
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                Data Criação
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏰</span>
                Horário
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">🩺</span>
                Serviço
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">👨‍⚕️</span>
                Profissional
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">📊</span>
                Status
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">💬</span>
                Observação
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚙️</span>
                Ações
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itensFiltrados.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">📋</span>
                  </div>
                  <p className="text-gray-500 font-medium">
                    {busca 
                      ? 'Nenhum resultado encontrado' 
                      : 'Nenhum item na fila de espera'
                    }
                  </p>
                  <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            itensFiltrados.map((item) => (
              <TableRow key={item.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 h-12">
                <TableCell className="py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {(item.pacienteNome || 'P')?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{item.pacienteNome || `ID: ${item.pacienteId}`}</span>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                    {item.createdAt ? formatarDataHora(item.createdAt).data : '-'}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <Badge className={`text-xs ${getHorarioColor(item.horarioPreferencia)}`}>
                    {HORA_LABEL[item.horarioPreferencia]}
                  </Badge>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                    {item.servicoNome || '-'}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-sm">
                    {item.profissionalNome || '-'}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <Badge className={`text-xs ${getStatusColor(item.status || 'pendente')}`}>
                    {item.status || 'pendente'}
                  </Badge>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-sm truncate max-w-xs">{item.observacao || '-'}</span>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex gap-1.5">
                    {canRead ? (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleVerDetalhes(item)}
                        title="Visualizar Item"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="default"
                              size="sm"
                              disabled={true}
                              className="bg-gray-400 cursor-not-allowed h-8 w-8 p-0"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Você não tem permissão para visualizar itens</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {canUpdate ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="group border-2 border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleEditarItem(item)}
                        title="Editar Item"
                      >
                        <Edit className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={true}
                              className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Você não tem permissão para editar itens</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {canToggleStatus ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="group border-2 border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white hover:border-orange-600 focus:ring-4 focus:ring-orange-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleToggleStatus(item)}
                        title={item.ativo ? "Desativar Item" : "Ativar Item"}
                      >
                        <RotateCcw className="w-4 h-4 text-orange-600 group-hover:text-white transition-colors" />
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={true}
                              className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Você não tem permissão para alterar status</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {canDelete ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="group border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-4 focus:ring-red-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => confirmarExclusao(item)}
                        title="Excluir Item"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 group-hover:text-white transition-colors" />
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={true}
                              className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Você não tem permissão para excluir itens</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <div className="pt-2 pl-6 pr-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Carregando fila de espera...</p>
        </div>
      </div>
    );
  }

  // Tela de acesso negado
  if (accessDenied) {
    return (
      <div className="pt-2 pl-6 pr-6 h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar esta funcionalidade.
          </p>
          <p className="text-sm text-gray-500">
            Entre em contato com o administrador do sistema para solicitar as devidas permissões.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="pt-2 pl-6 pr-6 h-full min-h-0 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white backdrop-blur border-b border-gray-200 flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">📋</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Fila de Espera
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar paciente, serviço, profissional..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Toggle de visualização */}
          <div className="flex border rounded-lg p-1 bg-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisualizacao('tabela')}
              className={`h-7 px-3 ${visualizacao === 'tabela' ? 'bg-white shadow-sm' : ''}`}
            >
              <List className="w-4 h-4 mr-1" />
              Tabela
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisualizacao('cards')}
              className={`h-7 px-3 ${visualizacao === 'cards' ? 'bg-white shadow-sm' : ''}`}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Cards
            </Button>
          </div>
          
          {canCreate ? (
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleAbrirNovoItem}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar à Fila
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button 
                    disabled={true}
                    className="bg-gray-400 cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar à Fila
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para adicionar itens à fila</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {visualizacao === 'cards' ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {renderCardView()}
        </div>
      ) : (
        renderTableView()
      )}

      {/* Modal FilaEspera */}
      <FilaEsperaModal
        isOpen={showFilaEsperaModal}
        editando={itemEdicao}
        onClose={handleFecharModal}
        onSuccess={handleSuccessModal}
      />

      {/* Modal de visualização */}
      <FilaEsperaViewModal
        isOpen={showDetalhesItem}
        item={itemDetalhes}
        onClose={() => setShowDetalhesItem(false)}
      />

      {/* Modal de confirmação de exclusão */}
      <ConfirmDeleteModal
        open={itemExcluindo !== null}
        onClose={cancelarExclusao}
        onConfirm={handleDelete}
        entityName={`Item ${itemExcluindo?.id.slice(0, 8) || ''}...`}
        entityType="item da fila"
        isLoading={deleteLoading}
        loadingText="Excluindo..."
        confirmText="Excluir Item"
      />
      </div>
    </TooltipProvider>
  );
}