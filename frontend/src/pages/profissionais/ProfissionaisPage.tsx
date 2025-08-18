import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, MapPin, User, CreditCard, Building, List, UserCheck, Phone, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppToast } from '@/services/toast';
import { getProfissionais, deleteProfissional, toggleProfissionalStatus } from '@/services/profissionais';
import { getConvenios } from '@/services/convenios';
import { getServicos } from '@/services/servicos';
import { getEspecialidades } from '@/services/especialidades';
import type { Profissional } from '@/types/Profissional';
import type { Servico } from '@/types/Servico';
import type { Convenio } from '@/types/Convenio';
import type { Especialidade } from '@/types/Especialidade';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Modais existentes
import CriarProfissionalModal from './CriarProfissionalModal';
import EditarProfissionalModal from './EditarProfissionalModal';
import AtribuirServicosModal from './AtribuirServicosModal';
import EditarEnderecoModal from './EditarEnderecoModal';
import EditarInfoProfissionalModal from './EditarInfoProfissionalModal';
import EditarDadosBancariosModal from './EditarDadosBancariosModal';
import EditarEmpresaContratoModal from './EditarEmpresaContratoModal';
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
  ResponsiveCardFooter,
  TableColumn 
} from '@/components/layout';
import type { FilterConfig } from '@/types/filters';
import { useViewMode } from '@/hooks/useViewMode';
import { useResponsiveTable } from '@/hooks/useResponsiveTable';
import { useTableFilters } from '@/hooks/useTableFilters';

// Função para formatar WhatsApp
const formatWhatsApp = (whatsapp: string) => {
  if (!whatsapp) return '';
  const numbers = whatsapp.replace(/\D/g, '');
  if (numbers.length === 13) {
    return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9)}`;
  }
  return whatsapp;
};

// Função para formatar CPF
const formatCPF = (cpf: string) => {
  if (!cpf) return '';
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length === 11) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
  }
  return cpf;
};

export const ProfissionaisPage = () => {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdateDadosPessoais, setCanUpdateDadosPessoais] = useState(true);
  const [canUpdateEndereco, setCanUpdateEndereco] = useState(true);
  const [canUpdateInfoProfissional, setCanUpdateInfoProfissional] = useState(true);
  const [canUpdateDadosBancarios, setCanUpdateDadosBancarios] = useState(true);
  const [canUpdateEmpresaContrato, setCanUpdateEmpresaContrato] = useState(true);
  const [canUpdateServicos, setCanUpdateServicos] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);

  // Estados dos modais
  const [modalCriar, setModalCriar] = useState(false);
  const [modalEditar, setModalEditar] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });
  const [modalAtribuir, setModalAtribuir] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });
  const [modalEndereco, setModalEndereco] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });
  const [modalInfoProfissional, setModalInfoProfissional] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });
  const [modalDadosBancarios, setModalDadosBancarios] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });
  const [modalEmpresaContrato, setModalEmpresaContrato] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });
  
  const [excluindo, setExcluindo] = useState<Profissional | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'profissionais-view' });
  
  // Configuração das colunas da tabela
  const columns: TableColumn<Profissional>[] = [
    {
      key: 'nome',
      header: '👨‍⚕️ Nome',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome do profissional...',
        label: 'Nome'
      },
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {item.nome.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{item.nome}</span>
        </div>
      )
    },
    {
      key: 'cpf',
      header: '📄 CPF',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'CPF do profissional...',
        label: 'CPF'
      },
      render: (item) => <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{formatCPF(item.cpf)}</span>
    },
    {
      key: 'email',
      header: '📧 Email',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Email do profissional...',
        label: 'Email'
      },
      render: (item) => <span className="text-sm text-violet-600">{item.email}</span>
    },
    {
      key: 'whatsapp',
      header: '📱 WhatsApp',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'WhatsApp do profissional...',
        label: 'WhatsApp'
      },
      render: (item) => (
        <span className="text-sm font-mono bg-green-100 px-2 py-1 rounded text-green-700">
          {item.whatsapp ? formatWhatsApp(item.whatsapp) : '-'}
        </span>
      )
    },
    {
      key: 'especialidades',
      header: '🎯 Especialidades',
      essential: true,
      render: (item) => {
        if (!item.especialidades || item.especialidades.length === 0) {
          return <span className="text-xs text-gray-400">Nenhuma</span>;
        }
        
        // Mapear IDs para nomes das especialidades
        const nomesEspecialidades = item.especialidades
          .map(esp => {
            const especialidade = especialidades.find(e => e.id === esp.id);
            return especialidade?.nome || 'Esp. não encontrada';
          })
          .filter(nome => nome !== 'Esp. não encontrada');

        if (nomesEspecialidades.length === 0) {
          return <span className="text-xs text-gray-400">Carregando...</span>;
        }

        return (
          <div className="flex flex-wrap gap-1">
            {nomesEspecialidades.slice(0, 2).map((nome, index) => (
              <Badge key={index} variant="outline" className="text-xs bg-purple-50 text-purple-700">
                {nome}
              </Badge>
            ))}
            {nomesEspecialidades.length > 2 && (
              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                +{nomesEspecialidades.length - 2}
              </Badge>
            )}
          </div>
        );
      }
    },
    {
      key: 'servicos',
      header: '🩺 Serviços',
      essential: true,
      className: 'text-center',
      render: (item) => (
        <div className="flex justify-center">
          {item.servicos && item.servicos.length > 0 ? (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
              {item.servicos.length}
            </Badge>
          ) : (
            <span className="text-xs text-gray-400">0</span>
          )}
        </div>
      )
    },
    {
      key: 'status',
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
      render: (item) => {
        return (
        <div className="flex gap-1.5">
          {/* Editar dados pessoais */}
          {canUpdateDadosPessoais ? (
            <ActionButton
              variant="view"
              module="profissionais"
              onClick={() => setModalEditar({ open: true, profissional: item })}
              title="Editar dados pessoais"
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
                      title="Sem permissão para editar dados pessoais"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para editar dados pessoais</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Atribuir serviços */}
          {canUpdateServicos ? (
            <ActionButton
              variant="view"
              module="profissionais"
              onClick={() => setModalAtribuir({ open: true, profissional: item })}
              title="Atribuir serviços"
            >
              <List className="w-4 h-4" />
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
                      title="Sem permissão para atribuir serviços"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para atribuir serviços</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Editar endereço */}
          {canUpdateEndereco ? (
            <ActionButton
              variant="view"
              module="profissionais"
              onClick={() => setModalEndereco({ open: true, profissional: item })}
              title="Editar endereço"
            >
              <MapPin className="w-4 h-4" />
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
                      title="Sem permissão para editar endereço"
                    >
                      <MapPin className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para editar endereço</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Informações profissionais */}
          {canUpdateInfoProfissional ? (
            <ActionButton
              variant="view"
              module="profissionais"
              onClick={() => setModalInfoProfissional({ open: true, profissional: item })}
              title="Informações profissionais"
            >
              <UserCheck className="w-4 h-4" />
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
                      title="Sem permissão para editar informações profissionais"
                    >
                      <UserCheck className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para editar informações profissionais</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Dados bancários */}
          {canUpdateDadosBancarios ? (
            <ActionButton
              variant="view"
              module="profissionais"
              onClick={() => setModalDadosBancarios({ open: true, profissional: item })}
              title="Dados bancários"
            >
              <CreditCard className="w-4 h-4" />
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
                      title="Sem permissão para editar dados bancários"
                    >
                      <CreditCard className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para editar dados bancários</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Empresa/Contrato */}
          {canUpdateEmpresaContrato ? (
            <ActionButton
              variant="view"
              module="profissionais"
              onClick={() => setModalEmpresaContrato({ open: true, profissional: item })}
              title="Empresa/Contrato"
            >
              <Building className="w-4 h-4" />
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
                      title="Sem permissão para editar empresa/contrato"
                    >
                      <Building className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para editar empresa/contrato</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {canUpdateDadosPessoais ? (
            <ActionButton
              variant={item.ativo === true ? 'delete' : 'view'}
              module="profissionais"
              onClick={async () => {
                try {
                  await toggleProfissionalStatus(item.id, !item.ativo);
                  AppToast.success(item.ativo ? 'Profissional inativado' : 'Profissional ativado');
                  fetchData();
                } catch (e: any) {
                  if (e?.response?.status === 403) return;
                  AppToast.error('Erro ao alterar status');
                }
              }}
              title={item.ativo === true ? 'Inativar profissional' : 'Ativar profissional'}
            >
              <RotateCcw className="w-4 h-4" />
            </ActionButton>
          ) : null}

          {canDelete ? (
            <ActionButton
              variant="delete"
              module="profissionais"
              onClick={() => setExcluindo(item)}
              title="Excluir profissional"
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
                  <p>Você não tem permissão para excluir profissionais</p>
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
  const profissionaisFiltrados = useMemo(() => {
    // Função para normalizar texto
    const normalizarBusca = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normalizarTelefone = (tel: string) => tel.replace(/\D/g, '');

    // Primeiro aplicar busca textual
    let dadosFiltrados = profissionais.filter(p => {
      if (busca.trim() === '') return true;
      
      const buscaNormalizada = normalizarBusca(busca);
      const nome = normalizarBusca(p.nome);
      const email = normalizarBusca(p.email || '');
      const buscaNumeros = busca.replace(/\D/g, '');
      
      let match = false;
      
      if (buscaNormalizada.length > 0) {
        match = nome.includes(buscaNormalizada) || email.includes(buscaNormalizada);
      }
      
      if (buscaNumeros.length > 0) {
        const cpf = (p.cpf || '').replace(/\D/g, '');
        const whatsapp = normalizarTelefone(p.whatsapp || '');
        match = match || cpf.includes(buscaNumeros) || whatsapp.includes(buscaNumeros);
      }
      
      return match;
    }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
    
    // Depois aplicar filtros dinâmicos
    return applyFilters(dadosFiltrados);
  }, [profissionais, busca, applyFilters]);

  const {
    data: profissionaisPaginados,
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
  } = useResponsiveTable(profissionaisFiltrados, 10);

  useEffect(() => {
    fetchData();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar cada permissão específica para profissionais
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/profissionais' && route.method.toLowerCase() === 'get';
      });
      
      const canCreate = allowedRoutes.some((route: any) => {
        return route.path === '/profissionais' && route.method.toLowerCase() === 'post';
      });
      
      // Verificar permissões específicas de atualização
      const canUpdateDadosPessoais = allowedRoutes.some((route: any) => {
        return route.path === '/profissionais/:id' && route.method.toLowerCase() === 'put';
      });
      
      const canUpdateEndereco = allowedRoutes.some((route: any) => {
        return route.path === '/profissionais/:id/endereco' && route.method.toLowerCase() === 'put';
      });
      
      const canUpdateInfoProfissional = allowedRoutes.some((route: any) => {
        return route.path === '/profissionais/:id/informacao-profissional' && route.method.toLowerCase() === 'put';
      });
      
      const canUpdateDadosBancarios = allowedRoutes.some((route: any) => {
        return route.path === '/profissionais/:id/dados-bancarios' && route.method.toLowerCase() === 'put';
      });
      
      const canUpdateEmpresaContrato = allowedRoutes.some((route: any) => {
        return route.path === '/profissionais/:id/empresa-contrato' && route.method.toLowerCase() === 'put';
      });
      
      const canUpdateServicos = allowedRoutes.some((route: any) => {
        return route.path === '/profissionais/:id/servicos' && route.method.toLowerCase() === 'put';
      });
      
      const canDelete = allowedRoutes.some((route: any) => {
        return route.path === '/profissionais/:id' && route.method.toLowerCase() === 'delete';
      });
      
      setCanCreate(canCreate);
      setCanUpdateDadosPessoais(canUpdateDadosPessoais);
      setCanUpdateEndereco(canUpdateEndereco);
      setCanUpdateInfoProfissional(canUpdateInfoProfissional);
      setCanUpdateDadosBancarios(canUpdateDadosBancarios);
      setCanUpdateEmpresaContrato(canUpdateEmpresaContrato);
      setCanUpdateServicos(canUpdateServicos);
      setCanDelete(canDelete);
      
      // Se não tem nem permissão de leitura, marca como access denied
      if (!canRead) {
        setAccessDenied(true);
      }
      
    } catch (error: any) {
      // Em caso de erro, desabilita tudo por segurança
      setCanCreate(false);
      setCanUpdateDadosPessoais(false);
      setCanUpdateEndereco(false);
      setCanUpdateInfoProfissional(false);
      setCanUpdateDadosBancarios(false);
      setCanUpdateEmpresaContrato(false);
      setCanUpdateServicos(false);
      setCanDelete(false);
      
      // Se retornar 401/403 no endpoint de permissões, considera acesso negado
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setAccessDenied(false);
    setProfissionais([]); // Limpa dados para evitar mostrar dados antigos
    try {
      const [profissionaisData, conveniosData, servicosData, especialidadesData] = await Promise.all([
        getProfissionais(),
        getConvenios(),
        getServicos(),
        getEspecialidades()
      ]);
      
      setProfissionais(profissionaisData);
      setConvenios(conveniosData);
      setServicos(servicosData);
      setEspecialidades(especialidadesData);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/profissionais', 'GET');
          setRouteInfo(info);
        } catch (routeError) {
          // Erro ao buscar informações da rota
        }
        // Não mostra toast aqui pois o interceptor já cuida disso
      } else {
        console.error('Erro ao carregar dados:', error);
        AppToast.error('Erro ao carregar dados', {
          description: 'Ocorreu um problema ao carregar os dados. Tente novamente.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Renderização do card
  const renderCard = (profissional: Profissional) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {profissional.nome.charAt(0).toUpperCase()}
            </div>
            <CardTitle className="text-sm font-medium truncate">{profissional.nome}</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs ml-2 flex-shrink-0 ${
              profissional.ativo === true
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {profissional.ativo === true ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2 mb-3">
          <CardDescription className="line-clamp-1 text-xs">
            📧 <span className="text-violet-600">{profissional.email}</span>
          </CardDescription>
          
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span>📄</span>
              <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-700">
                {formatCPF(profissional.cpf)}
              </span>
            </div>
            
            {profissional.whatsapp && (
              <div className="flex items-center gap-1">
                <span>📱</span>
                <span className="font-mono bg-green-100 px-1 py-0.5 rounded text-green-700">
                  {formatWhatsApp(profissional.whatsapp)}
                </span>
              </div>
            )}
          </div>

          {/* Especialidades */}
          {profissional.especialidades && profissional.especialidades.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-600">🎯 Especialidades:</span>
              <div className="flex flex-wrap gap-1">
                {(() => {
                  const nomesEspecialidades = profissional.especialidades
                    .map(esp => {
                      const especialidade = especialidades.find(e => e.id === esp.id);
                      return especialidade?.nome || null;
                    })
                    .filter(nome => nome !== null);

                  return (
                    <>
                      {nomesEspecialidades.slice(0, 2).map((nome, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-purple-50 text-purple-700">
                          {nome}
                        </Badge>
                      ))}
                      {nomesEspecialidades.length > 2 && (
                        <Badge variant="outline" className="text-xs bg-gray-50">
                          +{nomesEspecialidades.length - 2}
                        </Badge>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Serviços */}
          {profissional.servicos && profissional.servicos.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-600">🩺 Serviços:</span>
              <div className="flex flex-wrap gap-1">
                {profissional.servicos.slice(0, 2).map((servico, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-green-50 text-green-700">
                    {servico.nome || `Serv. ${index + 1}`}
                  </Badge>
                ))}
                {profissional.servicos.length > 2 && (
                  <Badge variant="outline" className="text-xs bg-gray-50">
                    +{profissional.servicos.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <ResponsiveCardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white"
          onClick={() => setModalEditar({ open: true, profissional })}
          title="Editar dados pessoais"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white"
          onClick={() => setModalAtribuir({ open: true, profissional })}
          title="Atribuir serviços"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white"
          onClick={() => setModalEndereco({ open: true, profissional })}
          title="Editar endereço"
        >
          <MapPin className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white"
          onClick={() => setModalInfoProfissional({ open: true, profissional })}
          title="Informações profissionais"
        >
          <UserCheck className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white"
          onClick={() => setModalDadosBancarios({ open: true, profissional })}
          title="Dados bancários"
        >
          <CreditCard className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white"
          onClick={() => setModalEmpresaContrato({ open: true, profissional })}
          title="Empresa/Contrato"
        >
          <Building className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
          onClick={() => setExcluindo(profissional)}
          title="Excluir profissional"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </ResponsiveCardFooter>
    </Card>
  );

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteProfissional(excluindo.id);
      AppToast.deleted('Profissional', `O profissional "${excluindo.nome}" foi excluído permanentemente.`);
      setExcluindo(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      
      if (error?.response?.status === 403) {
        // Erro de permissão será tratado pelo interceptor
        return;
      }
      
      let title = 'Erro ao excluir profissional';
      let description = 'Não foi possível excluir o profissional. Tente novamente ou entre em contato com o suporte.';
      
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

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando profissionais...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header da página */}
      <PageHeader title="Profissionais" module="profissionais" icon="👨‍⚕️">
        <SearchBar
          placeholder="Buscar por nome, CPF, email ou WhatsApp..."
          value={busca}
          onChange={setBusca}
          module="profissionais"
        />
        
        <FilterButton
          showFilters={mostrarFiltros}
          onToggleFilters={() => setMostrarFiltros(prev => !prev)}
          activeFiltersCount={activeFiltersCount}
          module="profissionais"
          disabled={filterConfigs.length === 0}
        />
        
        <ViewToggle 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
          module="profissionais"
        />
        
        {canCreate ? (
          <Button 
            className="!h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
            onClick={() => setModalCriar(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Profissional
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button 
                    className="!h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={true}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Profissional
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para criar profissionais</p>
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
          module="profissionais"
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
                <p>Você não tem permissão para visualizar profissionais</p>
              )}
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <ResponsiveTable 
            data={profissionaisPaginados}
            columns={columns}
            module="profissionais"
            emptyMessage="Nenhum profissional encontrado"
            isLoadingMore={isLoadingMore}
            hasNextPage={hasNextPage}
            isMobile={isMobile}
            scrollRef={targetRef}
          />
        ) : (
          <ResponsiveCards 
            data={profissionaisPaginados}
            renderCard={renderCard}
            emptyMessage="Nenhum profissional encontrado"
            emptyIcon="👨‍⚕️"
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
          module="profissionais"
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Modais - mantendo os existentes */}
      <CriarProfissionalModal
        open={modalCriar}
        onClose={() => setModalCriar(false)}
        onSuccess={() => {
          setModalCriar(false);
          fetchData();
        }}
      />

      <EditarProfissionalModal
        open={modalEditar.open}
        onClose={() => setModalEditar({ open: false, profissional: null })}
        profissional={modalEditar.profissional}
        onSuccess={() => {
          setModalEditar({ open: false, profissional: null });
          fetchData();
        }}
      />

      <AtribuirServicosModal
        open={modalAtribuir.open}
        onClose={() => setModalAtribuir({ open: false, profissional: null })}
        profissional={modalAtribuir.profissional}
        convenios={convenios}
        servicos={servicos}
        onSalvar={async (servicosIds: string[]) => {
          if (modalAtribuir.profissional) {
            const { updateProfissionalServicos } = await import('@/services/profissionais');
            await updateProfissionalServicos(modalAtribuir.profissional.id, servicosIds);
            AppToast.success('Serviços atribuídos com sucesso', { description: 'Os serviços foram associados ao profissional com sucesso.' });
            setModalAtribuir({ open: false, profissional: null });
            fetchData();
          }
        }}
      />

      <EditarEnderecoModal
        open={modalEndereco.open}
        onClose={() => setModalEndereco({ open: false, profissional: null })}
        profissional={modalEndereco.profissional}
        onSalvar={() => {
          setModalEndereco({ open: false, profissional: null });
          fetchData();
        }}
      />

      <EditarInfoProfissionalModal
        open={modalInfoProfissional.open}
        onClose={() => setModalInfoProfissional({ open: false, profissional: null })}
        profissional={modalInfoProfissional.profissional}
        onSalvar={() => {
          setModalInfoProfissional({ open: false, profissional: null });
          fetchData();
        }}
      />

      <EditarDadosBancariosModal
        open={modalDadosBancarios.open}
        onClose={() => setModalDadosBancarios({ open: false, profissional: null })}
        profissional={modalDadosBancarios.profissional}
        onSalvar={() => {
          setModalDadosBancarios({ open: false, profissional: null });
          fetchData();
        }}
      />

      <EditarEmpresaContratoModal
        open={modalEmpresaContrato.open}
        onClose={() => setModalEmpresaContrato({ open: false, profissional: null })}
        profissional={modalEmpresaContrato.profissional}
        onSalvar={() => {
          setModalEmpresaContrato({ open: false, profissional: null });
          fetchData();
        }}
      />

      {/* Modal de confirmação de exclusão */}
      <ConfirmDeleteModal
        open={!!excluindo}
        onClose={() => setExcluindo(null)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão de Profissional"
        entityName={excluindo?.nome || ''}
        entityType="profissional"
        isLoading={deleteLoading}
        loadingText="Excluindo profissional..."
        confirmText="Excluir Profissional"
      />
    </PageContainer>
  );
};