import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AppToast } from '@/services/toast';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import { getServicos, createServico, updateServico, deleteServico, toggleServicoStatus } from '@/services/servicos';
import { getConvenios } from '@/services/convenios';
import type { Servico } from '@/types/Servico';
import type { Convenio } from '@/types/Convenio';
import { FormErrorMessage } from '@/components/form-error-message';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { Slider } from '@/components/ui/slider';
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
import { getModuleTheme } from '@/types/theme';

// Interface para compatibilidade com API atual
interface ServicoAPI extends Servico {
  convenio?: { id: string; nome: string } | null;
}

// Definir tipo de formulário separado
interface FormularioServico {
  nome: string;
  descricao?: string | null;
  duracaoMinutos: string;
  preco: string;
  percentualClinica?: number | null;
  percentualProfissional?: number | null;
  procedimentoPrimeiroAtendimento?: string | null;
  procedimentoDemaisAtendimentos?: string | null;
  convenioId?: string;
}

// Função utilitária para formatar como moeda BRL
function formatarMoedaBRL(valor: string | number) {
  let num: number;
  if (typeof valor === 'number') {
    num = valor;
  } else {
    num = Number(valor.replace(',', '.'));
  }
  if (isNaN(num)) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Função para gerar cores diferentes para cada convênio
function getConvenioColor(convenioId: string) {
  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-800' },
    { bg: 'bg-green-100', text: 'text-green-800' },
    { bg: 'bg-purple-100', text: 'text-purple-800' },
    { bg: 'bg-orange-100', text: 'text-orange-800' },
    { bg: 'bg-pink-100', text: 'text-pink-800' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800' },
    { bg: 'bg-cyan-100', text: 'text-cyan-800' },
    { bg: 'bg-teal-100', text: 'text-teal-800' },
    { bg: 'bg-lime-100', text: 'text-lime-800' },
    { bg: 'bg-amber-100', text: 'text-amber-800' },
    { bg: 'bg-rose-100', text: 'text-rose-800' },
    { bg: 'bg-violet-100', text: 'text-violet-800' },
  ];
  
  let hash = 0;
  for (let i = 0; i < convenioId.length; i++) {
    const char = convenioId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Função para determinar a cor de fundo baseada no percentual do profissional
function getPercentualProfissionalColor(percentual: number | null) {
  if (percentual === null) return { bg: 'bg-gray-100', text: 'text-gray-600' };
  
  const padrao = 62;
  
  if (percentual <= padrao) {
    return { bg: 'bg-green-100', text: 'text-green-800' };
  } else if (percentual <= padrao + 5) {
    return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
  } else if (percentual <= padrao + 10) {
    return { bg: 'bg-orange-100', text: 'text-orange-800' };
  } else {
    return { bg: 'bg-red-100', text: 'text-red-800' };
  }
}

export const ServicosPage = () => {
  const theme = getModuleTheme('servicos');
  const [servicos, setServicos] = useState<ServicoAPI[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Servico | null>(null);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [form, setForm] = useState<FormularioServico>({
    nome: '',
    descricao: '',
    duracaoMinutos: '',
    preco: '',
    percentualClinica: null,
    percentualProfissional: null,
    procedimentoPrimeiroAtendimento: '',
    procedimentoDemaisAtendimentos: '',
    convenioId: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<Servico | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'servicos-view' });
  
  // Configuração das colunas da tabela com filtros dinâmicos (movido para antes dos hooks)
  const columns: TableColumn<ServicoAPI>[] = [
    {
      key: 'convenio',
      header: '🏥 Convênios',
      essential: true,
      className: 'text-center',
      filterable: {
        type: 'text',
        placeholder: 'Nome do convênio...',
        label: 'Convênio'
      },
      render: (item) => {
        if (item.convenio) {
          const colors = getConvenioColor(item.convenio.id);
          return (
            <span className={`${colors.bg} ${colors.text} text-xs font-medium px-2 py-0.5 rounded`}>
              {item.convenio.nome}
            </span>
          );
        }
        return <span className="text-gray-400 text-xs">Nenhum</span>;
      }
    },
    {
      key: 'nome',
      header: '📋 Nome',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome do serviço...',
        label: 'Nome'
      },
      render: (item) => <span className="text-sm font-medium">{item.nome}</span>
    },
    {
      key: 'descricao',
      header: '📝 Descrição',
      essential: false,
      filterable: {
        type: 'text',
        placeholder: 'Buscar na descrição...',
        label: 'Descrição'
      },
      render: (item) => <span className="text-sm">{item.descricao}</span>
    },
    {
      key: 'duracaoMinutos',
      header: '⏱️ Duração',
      essential: true,
      className: 'text-center',
      filterable: {
        type: 'range',
        label: 'Duração (min)',
        min: 0,
        max: 480
      },
      render: (item) => <span className="text-sm">{item.duracaoMinutos} min</span>
    },
    {
      key: 'preco',
      header: '💰 Preço',
      essential: true,
      className: 'text-center',
      filterable: {
        type: 'currency',
        label: 'Preço (R$)',
        currency: 'BRL'
      },
      render: (item) => (
        <span className="text-sm font-medium text-green-600">
          {item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      )
    },
    {
      key: 'valorClinica',
      header: '💰 Valor Clínica',
      essential: false,
      className: 'text-center',
      filterable: {
        type: 'currency',
        label: 'Valor Clínica (R$)',
        currency: 'BRL'
      },
      render: (item) => (
        <span className="text-sm font-medium text-green-600">
          {item.valorClinica != null
            ? Number(item.valorClinica).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : item.percentualClinica != null && item.preco != null 
            ? ((item.percentualClinica / 100) * item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : '-'
          }
        </span>
      )
    },
    {
      key: 'valorProfissional',
      header: '💵 Valor Profissional',
      essential: false,
      className: 'text-center',
      filterable: {
        type: 'currency',
        label: 'Valor Profissional (R$)',
        currency: 'BRL'
      },
      render: (item) => (
        <span className="text-sm font-medium text-green-600">
          {item.valorProfissional != null
            ? Number(item.valorProfissional).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : item.percentualProfissional != null && item.preco != null 
            ? ((item.percentualProfissional / 100) * item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : '-'
          }
        </span>
      )
    },
    {
      key: 'percentualClinica',
      header: '🏥 Clínica',
      essential: false,
      className: 'text-center',
      filterable: {
        type: 'percentage',
        label: 'Percentual Clínica (%)',
        min: 0,
        max: 100
      },
      render: (item) => {
        const colors = getPercentualProfissionalColor(item.percentualProfissional);
        return (
          <span className={`text-sm px-2 py-1 rounded-md font-medium ${colors.bg} ${colors.text}`}>
            {item.percentualClinica != null ? `${item.percentualClinica.toFixed(2).replace('.', ',')}%` : '-'}
          </span>
        );
      }
    },
    {
      key: 'percentualProfissional',
      header: '👨‍⚕️ Profissional',
      essential: false,
      className: 'text-center',
      filterable: {
        type: 'percentage',
        label: 'Percentual Profissional (%)',
        min: 0,
        max: 100
      },
      render: (item) => {
        const colors = getPercentualProfissionalColor(item.percentualProfissional);
        return (
          <span className={`text-sm px-2 py-1 rounded-md font-medium ${colors.bg} ${colors.text}`}>
            {item.percentualProfissional != null ? `${item.percentualProfissional.toFixed(2).replace('.', ',')}%` : '-'}
          </span>
        );
      }
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
          {canUpdate ? (
            <ActionButton
              variant="view"
              module="servicos"
              onClick={() => abrirModalEditar(item)}
              title="Editar Serviço"
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
                  <p>Você não tem permissão para editar serviços</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {canUpdate ? (
            <ActionButton
              variant={item.ativo === true ? 'delete' : 'view'}
              module="servicos"
              onClick={async () => {
                try {
                  await toggleServicoStatus(item.id, !item.ativo);
                  AppToast.success(item.ativo ? 'Serviço inativado' : 'Serviço ativado');
                  fetchServicos();
                } catch (e: any) {
                  if (e?.response?.status === 403) return;
                  AppToast.error('Erro ao alterar status');
                }
              }}
              title={item.ativo === true ? 'Inativar Serviço' : 'Ativar Serviço'}
            >
              <RotateCcw className="w-4 h-4" />
            </ActionButton>
          ) : null}

          {canDelete ? (
            <ActionButton
              variant="delete"
              module="servicos"
              onClick={() => confirmarExclusao(item)}
              title="Excluir Serviço"
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
                  <p>Você não tem permissão para excluir serviços</p>
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
  const servicosFiltrados = useMemo(() => {
    // Primeiro aplicar busca textual
    let dadosFiltrados = servicos.filter(s =>
      s.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (s.descricao || '').toLowerCase().includes(busca.toLowerCase()) ||
      s.convenio?.nome.toLowerCase().includes(busca.toLowerCase())
    );
    
    // Depois aplicar filtros dinâmicos baseados nas colunas
    // Precisamos ajustar os dados para que o hook possa aplicar os filtros corretamente
    dadosFiltrados = dadosFiltrados.map(servico => ({
      ...servico,
      // Extrair valores para filtros de campos calculados
      valorClinica: servico.valorClinica != null 
        ? servico.valorClinica
        : servico.percentualClinica != null && servico.preco != null 
        ? (servico.percentualClinica / 100) * servico.preco 
        : 0,
      valorProfissional: servico.valorProfissional != null 
        ? servico.valorProfissional
        : servico.percentualProfissional != null && servico.preco != null 
        ? (servico.percentualProfissional / 100) * servico.preco 
        : 0
    }));
    
    return applyFilters(dadosFiltrados);
  }, [servicos, busca, applyFilters]);

  const {
    data: servicosPaginados,
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
  } = useResponsiveTable(servicosFiltrados, 10);

  useEffect(() => {
    fetchServicos();
    fetchConvenios();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar cada permissão específica para serviços
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/servicos' && route.method.toLowerCase() === 'get';
      });
      
      const canCreate = allowedRoutes.some((route: any) => {
        return route.path === '/servicos' && route.method.toLowerCase() === 'post';
      });
      
      const canUpdate = allowedRoutes.some((route: any) => {
        return route.path === '/servicos/:id' && route.method.toLowerCase() === 'put';
      });
      
      const canDelete = allowedRoutes.some((route: any) => {
        return route.path === '/servicos/:id' && route.method.toLowerCase() === 'delete';
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

  const fetchServicos = async () => {
    setLoading(true);
    setAccessDenied(false);
    setServicos([]); // Limpa serviços para evitar mostrar dados antigos
    try {
      const data = await getServicos();
      setServicos(data);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/servicos', 'GET');
          setRouteInfo(info);
        } catch (routeError) {
          // Erro ao buscar informações da rota
        }
        // Não mostra toast aqui pois o interceptor já cuida disso
      } else {
        AppToast.error('Erro ao carregar serviços', {
          description: 'Ocorreu um problema ao carregar a lista de serviços. Tente novamente.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchConvenios = async () => {
    try {
      const data = await getConvenios();
      setConvenios(data);
    } catch (e) {
      AppToast.error('Erro ao carregar convênios', {
        description: 'Ocorreu um problema ao carregar a lista de convênios. Tente novamente.'
      });
    }
  };


  // Renderização do card
  const renderCard = (servico: ServicoAPI) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">🩺</span>
            <CardTitle className="text-sm font-medium truncate">{servico.nome}</CardTitle>
          </div>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <Badge 
              variant="outline" 
              className={`text-xs ${
                servico.ativo === true
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {servico.ativo === true ? 'Ativo' : 'Inativo'}
            </Badge>
            {servico.convenio && (() => {
              const colors = getConvenioColor(servico.convenio!.id);
              return (
                <Badge className={`text-xs flex-shrink-0 ${colors.bg} ${colors.text}`}>
                  {servico.convenio!.nome}
                </Badge>
              );
            })()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2 mb-3">
          {servico.descricao && (
            <CardDescription className="line-clamp-2 text-xs">
              {servico.descricao}
            </CardDescription>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span>⏱️</span>
              <span>{servico.duracaoMinutos} min</span>
            </div>
            <div className="flex items-center gap-1">
              <span>💰</span>
              <span className="font-bold text-green-600">
                {servico.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
          {servico.percentualClinica != null && servico.percentualProfissional != null && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Clínica:</span>
                <div className="flex items-center gap-1">
                  {(() => {
                    const colors = getPercentualProfissionalColor(servico.percentualProfissional);
                    return (
                      <Badge variant="outline" className={`text-xs px-1 py-0 ${colors.bg} ${colors.text}`}>
                        {servico.percentualClinica.toFixed(0)}%
                      </Badge>
                    );
                  })()}
                  <span className="text-green-600 font-medium">
                    {servico.valorClinica != null
                      ? Number(servico.valorClinica).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : ((servico.percentualClinica / 100) * servico.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    }
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Profissional:</span>
                <div className="flex items-center gap-1">
                  {(() => {
                    const colors = getPercentualProfissionalColor(servico.percentualProfissional);
                    return (
                      <Badge variant="outline" className={`text-xs px-1 py-0 ${colors.bg} ${colors.text}`}>
                        {servico.percentualProfissional.toFixed(0)}%
                      </Badge>
                    );
                  })()}
                  <span className="text-green-600 font-medium">
                    {servico.valorProfissional != null
                      ? Number(servico.valorProfissional).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : ((servico.percentualProfissional / 100) * servico.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <ResponsiveCardFooter>
        {canUpdate ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white"
            onClick={() => abrirModalEditar(servico)}
            title="Editar serviço"
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
                <p>Você não tem permissão para editar serviços</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {canDelete ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
            onClick={() => confirmarExclusao(servico)}
            title="Excluir serviço"
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
                <p>Você não tem permissão para excluir serviços</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </ResponsiveCardFooter>
    </Card>
  );

  // Funções de manipulação
  const abrirModalNovo = () => {
    setEditando(null);
    setForm({
      nome: '',
      descricao: '',
      duracaoMinutos: '',
      preco: '',
      percentualClinica: null,
      percentualProfissional: null,
      procedimentoPrimeiroAtendimento: '',
      procedimentoDemaisAtendimentos: '',
      convenioId: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (s: ServicoAPI) => {
    setEditando(s);
    let precoValue = '';
    if (s.preco !== undefined && s.preco !== null) {
      precoValue = formatarMoedaBRL(String(s.preco));
    }
    setForm({
      nome: s.nome,
      descricao: s.descricao || '',
      duracaoMinutos: s.duracaoMinutos !== undefined && s.duracaoMinutos !== null ? String(s.duracaoMinutos) : '',
      preco: precoValue,
      percentualClinica: s.percentualClinica != null ? s.percentualClinica : 38,
      percentualProfissional: s.percentualProfissional != null ? s.percentualProfissional : 62,
      procedimentoPrimeiroAtendimento: s.procedimentoPrimeiroAtendimento || '',
      procedimentoDemaisAtendimentos: s.procedimentoDemaisAtendimentos || '',
      convenioId: s.convenio?.id || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      nome: '',
      descricao: '',
      duracaoMinutos: '',
      preco: '',
      percentualClinica: null,
      percentualProfissional: null,
      procedimentoPrimeiroAtendimento: '',
      procedimentoDemaisAtendimentos: '',
      convenioId: '',
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || form.nome.trim().length < 2) {
      setFormError('O nome deve ter pelo menos 2 caracteres.');
      AppToast.validation('Nome muito curto', 'O nome do serviço deve ter pelo menos 2 caracteres.');
      return;
    }
    const duracaoNumber = Number(form.duracaoMinutos);
    if (isNaN(duracaoNumber) || duracaoNumber < 1) {
      setFormError('A duração deve ser maior ou igual a 1.');
      return;
    }
    const precoNumber = Number(form.preco.replace(/\./g, '').replace(',', '.'));
    if (isNaN(precoNumber) || precoNumber < 1) {
      setFormError('O preço deve ser maior ou igual a 1.');
      return;
    }
    if (!form.convenioId) {
      setFormError('Selecione um convênio.');
      return;
    }
    const nomeDuplicado = servicos.some(s =>
      s.nome.trim().toLowerCase() === form.nome.trim().toLowerCase() &&
      s.convenio?.id === form.convenioId &&
      String(s.duracaoMinutos) === String(form.duracaoMinutos) &&
      (!editando || s.id !== editando.id)
    );
    if (nomeDuplicado) {
      setFormError('Já existe um serviço com este nome, convênio e duração.');
      setFormLoading(false);
      return;
    }
    setFormLoading(true);
    try {
      // Calcular valores diretos baseados nos percentuais e preço
      const valorClinicaCalculado = form.percentualClinica != null && precoNumber > 0 
        ? Number(((form.percentualClinica / 100) * precoNumber).toFixed(2))
        : null;
      const valorProfissionalCalculado = form.percentualProfissional != null && precoNumber > 0 
        ? Number(((form.percentualProfissional / 100) * precoNumber).toFixed(2))
        : null;

      const payload = { 
        ...form, 
        duracaoMinutos: duracaoNumber, 
        preco: precoNumber, 
        convenioId: form.convenioId,
        valorClinica: valorClinicaCalculado,
        valorProfissional: valorProfissionalCalculado
      };
      if (editando) {
        await updateServico(editando.id, payload);
        AppToast.updated('Serviço', `O serviço "${form.nome.trim()}" foi atualizado com sucesso.`);
      } else {
        await createServico(payload);
        AppToast.created('Serviço', `O serviço "${form.nome.trim()}" foi criado com sucesso.`);
      }
      fecharModal();
      fetchServicos();
    } catch (e: any) {
      let title = 'Erro ao salvar serviço';
      let description = 'Não foi possível salvar o serviço. Verifique os dados e tente novamente.';
      
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

  const confirmarExclusao = (s: Servico) => {
    setExcluindo(s);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteServico(excluindo.id);
      AppToast.deleted('Serviço', `O serviço "${excluindo.nome}" foi excluído permanentemente.`);
      setExcluindo(null);
      fetchServicos();
    } catch (e) {
      if (e?.response?.status === 403) {
        // Erro de permissão será tratado pelo interceptor
        return;
      }
      
      AppToast.error('Erro ao excluir serviço', {
        description: 'Não foi possível excluir o serviço. Tente novamente ou entre em contato com o suporte.'
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando serviços...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header da página */}
      <PageHeader title="Serviços" module="servicos" icon="🩺">
        <SearchBar
          placeholder="Buscar serviços..."
          value={busca}
          onChange={setBusca}
          module="servicos"
        />
        
        <FilterButton
          showFilters={mostrarFiltros}
          onToggleFilters={() => setMostrarFiltros(prev => !prev)}
          activeFiltersCount={activeFiltersCount}
          module="servicos"
          disabled={filterConfigs.length === 0}
          tooltip={filterConfigs.length === 0 ? 'Nenhum filtro configurado' : undefined}
        />
        
        <ViewToggle 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
          module="servicos"
        />
        
        {canCreate ? (
          <Button 
            className={`!h-10 bg-gradient-to-r ${theme.primaryButton} ${theme.primaryButtonHover} shadow-lg hover:shadow-xl transition-all duration-200 font-semibold`}
            onClick={abrirModalNovo}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Serviço
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
                    Novo Serviço
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para criar serviços</p>
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
          module="servicos"
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
                <p>Você não tem permissão para visualizar serviços</p>
              )}
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <ResponsiveTable 
            data={servicosPaginados}
            columns={columns}
            module="servicos"
            emptyMessage="Nenhum serviço encontrado"
            isLoadingMore={isLoadingMore}
            hasNextPage={hasNextPage}
            isMobile={isMobile}
            scrollRef={targetRef}
          />
        ) : (
          <ResponsiveCards 
            data={servicosPaginados}
            renderCard={renderCard}
            emptyMessage="Nenhum serviço encontrado"
            emptyIcon="🩺"
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
          module="servicos"
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Modal de cadastro/edição - mantido igual ao original */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">🏥</span>
                  <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Convênio</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <SingleSelectDropdown
                    options={convenios}
                    selected={convenios.find(c => c.id === form.convenioId) || null}
                    onChange={(selected) => setForm(f => ({ ...f, convenioId: selected?.id || '' }))}
                    placeholder="Digite para buscar convênios..."
                    formatOption={(option) => option.nome}
                    headerText="Convênios disponíveis"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Nome do Serviço</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    minLength={2}
                    disabled={formLoading}
                    autoFocus
                    className="hover:border-green-300 focus:border-green-500 focus:ring-green-100"
                    placeholder="Ex: Consulta Médica"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Descrição</span>
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={form.descricao || ''}
                    onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    disabled={formLoading}
                    className="hover:border-green-300 focus:border-green-500 focus:ring-green-100"
                    placeholder="Ex: Consulta médica especializada"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">⏱️</span>
                    <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Duração (min)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={form.duracaoMinutos}
                      onChange={e => setForm(f => ({ ...f, duracaoMinutos: e.target.value }))}
                      min={1}
                      disabled={formLoading}
                      className="hover:border-green-300 focus:border-green-500 focus:ring-green-100"
                      placeholder="Ex: 30"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">💰</span>
                    <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Preço (R$)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={form.preco}
                      onChange={e => {
                        let valor = e.target.value;
                        valor = valor.replace(/[^\d,]/g, '');
                        const partes = valor.split(',');
                        if (partes.length > 2) valor = partes[0] + ',' + partes.slice(1).join('');
                        setForm(f => {
                          const precoNum = Number(valor.replace(/\./g, '').replace(',', '.'));
                          if (!editando && precoNum > 0 && (f.percentualClinica == null && f.percentualProfissional == null)) {
                            return { ...f, preco: valor, percentualClinica: 38, percentualProfissional: 62 };
                          }
                          return { ...f, preco: valor };
                        });
                      }}
                      onBlur={e => {
                        setForm(f => {
                          let novoForm = { ...f, preco: formatarMoedaBRL(f.preco) };
                          if (!editando && (f.percentualClinica == null && f.percentualProfissional == null)) {
                            novoForm.percentualClinica = 38;
                            novoForm.percentualProfissional = 62;
                          }
                          return novoForm;
                        });
                      }}
                      className="hover:border-green-300 focus:border-green-500 focus:ring-green-100"
                      placeholder="Ex: 150,00"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4">
                {/* Clínica */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">🏥</span>
                    <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Valor Clínica</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">%</span>
                        <Input
                          type="number"
                          value={form.percentualClinica ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '') {
                              setForm(f => ({ ...f, percentualClinica: null, percentualProfissional: null }));
                            } else {
                              const num = Math.max(0, Math.min(100, Number(val)));
                              setForm(f => ({
                                ...f,
                                percentualClinica: num,
                                percentualProfissional: 100 - num
                              }));
                            }
                          }}
                          min={0}
                          max={100}
                          step={0.01}
                          disabled={formLoading || !form.preco || isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) || Number(form.preco.replace(/\./g, '').replace(',', '.')) <= 0}
                          className="hover:border-green-300 focus:border-green-500 focus:ring-green-100"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">R$</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={
                            form.percentualClinica != null && form.preco && !isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) && Number(form.preco.replace(/\./g, '').replace(',', '.')) > 0
                              ? ((form.percentualClinica / 100) * Number(form.preco.replace(/\./g, '').replace(',', '.'))).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : ''
                          }
                          onChange={e => {
                            let valor = e.target.value;
                            valor = valor.replace(/[^\d,]/g, '');
                            const partes = valor.split(',');
                            if (partes.length > 2) valor = partes[0] + ',' + partes.slice(1).join('');
                            const precoNum = Number(form.preco.replace(/\./g, '').replace(',', '.'));
                            if (!precoNum) return setForm(f => ({ ...f, percentualClinica: null, percentualProfissional: null }));
                            const valorNum = Number(valor.replace(/\./g, '').replace(',', '.'));
                            if (isNaN(valorNum)) return;
                            const pct = Number(((valorNum / precoNum) * 100).toFixed(2));
                            setForm(f => ({ ...f, percentualClinica: pct, percentualProfissional: 100 - pct }));
                          }}
                          onBlur={e => {
                            setForm(f => {
                              const precoNum = Number(f.preco.replace(/\./g, '').replace(',', '.'));
                              if (!precoNum || f.percentualClinica == null) return f;
                              const valor = ((f.percentualClinica / 100) * precoNum).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                              return { ...f, percentualClinica: f.percentualClinica, percentualProfissional: f.percentualProfissional };
                            });
                          }}
                          disabled={formLoading || !form.preco || isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) || Number(form.preco.replace(/\./g, '').replace(',', '.')) <= 0}
                          className="hover:border-green-300 focus:border-green-500 focus:ring-green-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Profissional */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">👨‍⚕️</span>
                    <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Valor Profissional</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">%</span>
                        <Input
                          type="number"
                          value={form.percentualProfissional ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '') {
                              setForm(f => ({ ...f, percentualProfissional: null, percentualClinica: null }));
                            } else {
                              const num = Math.max(0, Math.min(100, Number(val)));
                              setForm(f => ({
                                ...f,
                                percentualProfissional: num,
                                percentualClinica: 100 - num
                              }));
                            }
                          }}
                          min={0}
                          max={100}
                          step={0.01}
                          disabled={formLoading || !form.preco || isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) || Number(form.preco.replace(/\./g, '').replace(',', '.')) <= 0}
                          className="hover:border-green-300 focus:border-green-500 focus:ring-green-100"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">R$</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={
                            form.percentualProfissional != null && form.preco && !isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) && Number(form.preco.replace(/\./g, '').replace(',', '.')) > 0
                              ? ((form.percentualProfissional / 100) * Number(form.preco.replace(/\./g, '').replace(',', '.'))).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : ''
                          }
                          onChange={e => {
                            let valor = e.target.value;
                            valor = valor.replace(/[^\d,]/g, '');
                            const partes = valor.split(',');
                            if (partes.length > 2) valor = partes[0] + ',' + partes.slice(1).join('');
                            const precoNum = Number(form.preco.replace(/\./g, '').replace(',', '.'));
                            if (!precoNum) return setForm(f => ({ ...f, percentualProfissional: null, percentualClinica: null }));
                            const valorNum = Number(valor.replace(/\./g, '').replace(',', '.'));
                            if (isNaN(valorNum)) return;
                            const pct = Number(((valorNum / precoNum) * 100).toFixed(2));
                            setForm(f => ({ ...f, percentualProfissional: pct, percentualClinica: 100 - pct }));
                          }}
                          onBlur={e => {
                            setForm(f => {
                              const precoNum = Number(f.preco.replace(/\./g, '').replace(',', '.'));
                              if (!precoNum || f.percentualProfissional == null) return f;
                              const valor = ((f.percentualProfissional / 100) * precoNum).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                              return { ...f, percentualProfissional: f.percentualProfissional, percentualClinica: f.percentualClinica };
                            });
                          }}
                          disabled={formLoading || !form.preco || isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) || Number(form.preco.replace(/\./g, '').replace(',', '.')) <= 0}
                          className="hover:border-green-300 focus:border-green-500 focus:ring-green-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full mt-6 mb-2">
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[form.percentualClinica ?? 0]}
                  onValueChange={([value]) => {
                    setForm(f => ({
                      ...f,
                      percentualClinica: value,
                      percentualProfissional: 100 - value
                    }));
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">🩺</span>
                    <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Procedimento 1º Atendimento</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={form.procedimentoPrimeiroAtendimento || ''}
                      onChange={e => setForm(f => ({ ...f, procedimentoPrimeiroAtendimento: e.target.value }))}
                      disabled={formLoading}
                      className="hover:border-green-300 focus:border-green-500 focus:ring-green-100"
                      placeholder="Ex: 10101012"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">🩺</span>
                    <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Procedimento Demais Atendimentos</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={form.procedimentoDemaisAtendimentos || ''}
                      onChange={e => setForm(f => ({ ...f, procedimentoDemaisAtendimentos: e.target.value }))}
                      disabled={formLoading}
                      className="hover:border-green-300 focus:border-green-500 focus:ring-green-100"
                      placeholder="Ex: 10101013"
                    />
                  </div>
                </div>
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
        title="Confirmar Exclusão de Serviço"
        entityName={excluindo?.nome || ''}
        entityType="serviço"
        isLoading={deleteLoading}
        loadingText="Excluindo serviço..."
        confirmText="Excluir Serviço"
      />
    </PageContainer>
  );
};