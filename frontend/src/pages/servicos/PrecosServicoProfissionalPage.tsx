import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2, User, Briefcase, DollarSign, Percent, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { FormErrorMessage } from '@/components/form-error-message';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
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
  TableColumn 
} from '@/components/layout';
import { useViewMode } from '@/hooks/useViewMode';
import { useResponsiveTable } from '@/hooks/useResponsiveTable';
import { useTableFilters } from '@/hooks/useTableFilters';
import { getModuleTheme } from '@/types/theme';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AppToast } from '@/services/toast';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';

import { Badge } from '@/components/ui/badge';
import type { PrecoServicoProfissional } from '@/types/PrecoServicoProfissional';
import type { Profissional } from '@/types/Profissional';
import type { Servico } from '@/types/Servico';
import { 
  getPrecosServicoProfissional, 
  createPrecoServicoProfissional, 
  updatePrecoServicoProfissional, 
  deletePrecoServicoProfissional 
} from '@/services/precos-servicos-profissionais';
import { getProfissionais } from '@/services/profissionais';
import { getServicos } from '@/services/servicos';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

interface FormData {
  profissionalId: string;
  servicoId: string;
  valorProfissional: string;
}

// Função para determinar a cor de fundo baseada no percentual do profissional
// Padrão: 62% profissional (verde) - quanto maior que 62%, mais vermelho
// Usada também para clínica: se profissional está verde, clínica também está
function getPercentualProfissionalColor(percentual: number | null) {
  if (percentual === null) return { bg: 'bg-gray-100', text: 'text-gray-600' };
  
  const padrao = 62; // Percentual padrão para profissionais
  
  if (percentual <= padrao) {
    // Verde: percentual menor ou igual ao padrão
    return { bg: 'bg-green-100', text: 'text-green-800' };
  } else if (percentual <= padrao + 5) {
    // Amarelo: até 5% acima do padrão (62% a 67%)
    return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
  } else if (percentual <= padrao + 10) {
    // Laranja: até 10% acima do padrão (67% a 72%)
    return { bg: 'bg-orange-100', text: 'text-orange-800' };
  } else {
    // Vermelho: mais de 10% acima do padrão (>72%)
    return { bg: 'bg-red-100', text: 'text-red-800' };
  }
}

export default function PrecosServicoProfissionalPage() {
  const theme = getModuleTheme('servicos');
  const [precos, setPrecos] = useState<PrecoServicoProfissional[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<PrecoServicoProfissional | null>(null);
  const [form, setForm] = useState<FormData>({
    profissionalId: '',
    servicoId: '',
    valorProfissional: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<PrecoServicoProfissional | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'precos-servicos-view' });
  
  // Configuração das colunas da tabela com filtros dinâmicos
  const columns: TableColumn<PrecoServicoProfissional>[] = [
    {
      key: 'profissional',
      header: '👨‍⚕️ Profissional',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome do profissional...',
        label: 'Profissional'
      },
      render: (item) => {
        const profissional = profissionais.find(p => p.id === item.profissionalId);
        return (
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 bg-gradient-to-r ${theme.primaryButton} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
              {profissional?.nome?.charAt(0).toUpperCase() || 'P'}
            </div>
            <span className="text-sm font-medium">{profissional?.nome || 'N/A'}</span>
          </div>
        );
      }
    },
    {
      key: 'servico',
      header: '🩺 Serviço',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome do serviço...',
        label: 'Serviço'
      },
      render: (item) => {
        const servico = servicos.find(s => s.id === item.servicoId);
        return <span className="text-sm">{servico?.nome || 'N/A'}</span>;
      }
    },
    {
      key: 'duracao',
      header: '⏱️ Duração',
      essential: false,
      render: (item) => {
        const servico = servicos.find(s => s.id === item.servicoId);
        return (
          <div className="flex items-center justify-center">
            <Clock className="w-3 h-3 text-gray-400 mr-1" />
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
              {servico?.duracaoMinutos ? `${servico.duracaoMinutos} min` : 'N/A'}
            </span>
          </div>
        );
      }
    },
    {
      key: 'precoBase',
      header: '💰 Preço Base',
      essential: false,
      render: (item) => {
        const servico = servicos.find(s => s.id === item.servicoId);
        return <span className="text-sm font-medium text-green-600">{formatarMoeda(servico?.preco || 0)}</span>;
      }
    },
    {
      key: 'valorClinica',
      header: '💰 Valor Clínica',
      essential: true,
      render: (item) => (
        <span className="text-sm font-medium text-blue-600">
          {formatarMoeda(calcularValorEmReais(item, 'clinica'))}
        </span>
      )
    },
    {
      key: 'valorProfissional',
      header: '💵 Valor Profissional',
      essential: true,
      render: (item) => (
        <span className="text-sm font-medium text-emerald-600">
          {formatarMoeda(calcularValorEmReais(item, 'profissional'))}
        </span>
      )
    },
    {
      key: 'percentualClinica',
      header: '🏥 Clínica (%)',
      essential: false,
      render: (item) => {
        const percentualClinica = item.percentualClinica || 0;
        const colors = getPercentualProfissionalColor(item.percentualProfissional || 0);
        return (
          <span className={`text-sm px-2 py-1 rounded-md font-medium ${colors.bg} ${colors.text}`}>
            {percentualClinica.toFixed(2).replace('.', ',')}%
          </span>
        );
      }
    },
    {
      key: 'percentualProfissional',
      header: '👨‍⚕️ Profissional (%)',
      essential: true,
      render: (item) => {
        const percentualAtual = obterPercentualAtual(item);
        const colors = getPercentualProfissionalColor(percentualAtual);
        return (
          <span className={`text-sm px-2 py-1 rounded-md font-medium ${colors.bg} ${colors.text}`}>
            {percentualAtual.toFixed(2).replace('.', ',')}%
          </span>
        );
      }
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
              variant="edit"
              module="servicos"
              onClick={() => abrirModalEditar(item)}
              title="Editar Preço"
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
                      className="h-8 w-8 p-0 border-green-300 text-green-600 opacity-50 cursor-not-allowed"
                      disabled={true}
                      title="Sem permissão para editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para editar preços</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {canDelete ? (
            <ActionButton
              variant="delete"
              module="servicos"
              onClick={() => confirmarExclusao(item)}
              title="Excluir Preço"
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
                  <p>Você não tem permissão para excluir preços</p>
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

  useEffect(() => {
    carregarDados();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar cada permissão específica para precos-servicos-profissionais
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/precos-servicos-profissionais' && route.method.toLowerCase() === 'get';
      });
      
      const canCreate = allowedRoutes.some((route: any) => {
        return route.path === '/precos-servicos-profissionais' && route.method.toLowerCase() === 'post';
      });
      
      const canUpdate = allowedRoutes.some((route: any) => {
        return route.path === '/precos-servicos-profissionais/:id' && route.method.toLowerCase() === 'put';
      });
      
      const canDelete = allowedRoutes.some((route: any) => {
        return route.path === '/precos-servicos-profissionais/:id' && route.method.toLowerCase() === 'delete';
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

  const carregarDados = async () => {
    setLoading(true);
    setAccessDenied(false);
    setPrecos([]); // Limpa dados para evitar mostrar dados antigos
    try {
      const [precosData, profissionaisData, servicosData] = await Promise.all([
        getPrecosServicoProfissional(),
        getProfissionais(),
        getServicos(),
      ]);
      
      setPrecos(precosData);
      setProfissionais(profissionaisData);
      setServicos(servicosData);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/precos-servicos-profissionais', 'GET');
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

  const normalizar = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  
  // Filtrar dados baseado na busca e filtros dinâmicos
  const precosFiltrados = useMemo(() => {
    // Primeiro aplicar busca textual
    let dadosFiltrados = precos.filter(p => {
      const profissional = profissionais.find(prof => prof.id === p.profissionalId);
      const servico = servicos.find(s => s.id === p.servicoId);
      const buscaNorm = normalizar(busca);
      
      return (
        (profissional && normalizar(profissional.nome).includes(buscaNorm)) ||
        (servico && normalizar(servico.nome).includes(buscaNorm))
      );
    });
    
    // Depois aplicar filtros dinâmicos
    return applyFilters(dadosFiltrados);
  }, [precos, profissionais, servicos, busca, applyFilters]);

  // Ordenar os dados: primeiro por nome, segundo por serviço, terceiro por duração
  const precosOrdenados = useMemo(() => {
    return precosFiltrados.sort((a, b) => {
      const profissionalA = profissionais.find(p => p.id === a.profissionalId);
      const profissionalB = profissionais.find(p => p.id === b.profissionalId);
      const servicoA = servicos.find(s => s.id === a.servicoId);
      const servicoB = servicos.find(s => s.id === b.servicoId);

      // 1º critério: Nome do profissional (alfabética)
      const nomeA = normalizar(profissionalA?.nome || '');
      const nomeB = normalizar(profissionalB?.nome || '');
      if (nomeA !== nomeB) {
        return nomeA.localeCompare(nomeB);
      }

      // 2º critério: Nome do serviço (alfabética)
      const servicoNomeA = normalizar(servicoA?.nome || '');
      const servicoNomeB = normalizar(servicoB?.nome || '');
      if (servicoNomeA !== servicoNomeB) {
        return servicoNomeA.localeCompare(servicoNomeB);
      }

      // 3º critério: Duração (numérica)
      const duracaoA = servicoA?.duracaoMinutos || 0;
      const duracaoB = servicoB?.duracaoMinutos || 0;
      return duracaoA - duracaoB;
    });
  }, [precosFiltrados, profissionais, servicos]);

  const {
    data: precosPaginados,
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
  } = useResponsiveTable(precosOrdenados, 10);

  // Renderização do card para modo responsivo
  const renderCard = (preco: PrecoServicoProfissional) => {
    const profissional = profissionais.find(p => p.id === preco.profissionalId);
    const servico = servicos.find(s => s.id === preco.servicoId);
    const percentualAtual = obterPercentualAtual(preco);
    const colors = getPercentualProfissionalColor(percentualAtual);
    
    return (
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg">💼</span>
              <CardTitle className="text-sm font-medium truncate">
                {profissional?.nome || 'N/A'}
              </CardTitle>
            </div>
            <div className={`w-8 h-8 bg-gradient-to-r ${theme.primaryButton} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
              {profissional?.nome?.charAt(0).toUpperCase() || 'P'}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Serviço:</span>
              <span className="text-xs font-medium text-indigo-700">
                {servico?.nome || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Duração:</span>
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {servico?.duracaoMinutos ? `${servico.duracaoMinutos} min` : 'N/A'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center">
                <span className="text-xs text-muted-foreground">Valor Profissional</span>
                <p className="text-sm font-medium text-emerald-600">
                  {formatarMoeda(calcularValorEmReais(preco, 'profissional'))}
                </p>
              </div>
              <div className="text-center">
                <span className="text-xs text-muted-foreground">Valor Clínica</span>
                <p className="text-sm font-medium text-blue-600">
                  {formatarMoeda(calcularValorEmReais(preco, 'clinica'))}
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <span className={`text-xs px-2 py-1 rounded-md font-medium ${colors.bg} ${colors.text}`}>
                Prof: {percentualAtual.toFixed(1)}% | Clín: {(preco.percentualClinica || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0 px-3 pb-3">
          <div className="flex items-center gap-2 w-full">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-7 text-xs border-green-300 text-green-600 hover:bg-green-600 hover:text-white"
              onClick={() => abrirModalEditar(preco)}
            >
              <Edit className="w-3 h-3 mr-1" />
              Editar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-7 text-xs border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
              onClick={() => confirmarExclusao(preco)}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Excluir
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  };

  const abrirModalNovo = () => {
    setEditando(null);
    setForm({
      profissionalId: '',
      servicoId: '',
      valorProfissional: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (preco: PrecoServicoProfissional) => {
    setEditando(preco);
    
    // Calcular valor em R$ a partir do percentual salvo no banco
    const valorEmReais = calcularValorEmReais(preco, 'profissional');
    
    setForm({
      profissionalId: preco.profissionalId,
      servicoId: preco.servicoId,
      valorProfissional: valorEmReais.toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }),
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      profissionalId: '',
      servicoId: '',
      valorProfissional: '',
    });
    setFormError('');
  };

  const calcularPercentuais = (servicoId: string, valorProfissional: number) => {
    const servico = servicos.find(s => s.id === servicoId);
    if (!servico || !servico.preco || valorProfissional <= 0) {
      return { 
        percentualProfissional: 0, 
        percentualClinica: 0
      };
    }
    
    const percentualProfissional = Math.min(100, (valorProfissional / servico.preco) * 100);
    const percentualClinica = 100 - percentualProfissional;
    
    return { 
      percentualProfissional: Number(percentualProfissional.toFixed(2)), 
      percentualClinica: Number(percentualClinica.toFixed(2))
    };
  };

  const formatarMoedaInput = (valor: string) => {
    // Remove tudo que não for dígito
    const numero = valor.replace(/\D/g, '');
    
    // Converte para centavos
    const valorEmCentavos = parseInt(numero) || 0;
    
    // Converte para reais
    const valorEmReais = valorEmCentavos / 100;
    
    // Formata com vírgula e pontos
    return valorEmReais.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const valorProfissionalNumerico = Number(form.valorProfissional.replace(/\./g, '').replace(',', '.')) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.profissionalId) {
      setFormError('Selecione um profissional.');
      AppToast.validation('Profissional obrigatório', 'Selecione um profissional para continuar.');
      return;
    }
    
    if (!form.servicoId) {
      setFormError('Selecione um serviço.');
      AppToast.validation('Serviço obrigatório', 'Selecione um serviço para continuar.');
      return;
    }
    
    const valorProf = valorProfissionalNumerico;
    
    if (valorProf <= 0) {
      setFormError('Digite um valor válido para o profissional.');
      return;
    }

    const servico = servicos.find(s => s.id === form.servicoId);
    
    if (!servico) {
      setFormError('Serviço não encontrado.');
      return;
    }

    if (valorProf > servico.preco) {
      setFormError('O valor do profissional não pode ser maior que o preço base do serviço.');
      return;
    }

    // Verificar se já existe um preço para esta combinação profissional/serviço
    const jaExiste = precos.some(p => 
      p.profissionalId === form.profissionalId && 
      p.servicoId === form.servicoId && 
      (!editando || p.id !== editando.id)
    );
    
    if (jaExiste) {
      const profissional = profissionais.find(p => p.id === form.profissionalId);
      const servico = servicos.find(s => s.id === form.servicoId);
      setFormError(`Já existe um preço personalizado para ${profissional?.nome} no serviço "${servico?.nome}". Use a opção "Editar" na tabela.`);
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      // Calcular valores e percentuais
      const valorClinica = servico.preco - valorProf;
      const percentualProfissional = Number(((valorProf / servico.preco) * 100).toFixed(2));
      const percentualClinica = Number(((valorClinica / servico.preco) * 100).toFixed(2));
      
      // Agora enviamos tanto valores diretos quanto percentuais
      const dadosPreco: Omit<PrecoServicoProfissional, 'id'> = {
        profissionalId: form.profissionalId,
        servicoId: form.servicoId,
        precoProfissional: valorProf,              // Valor direto do profissional
        precoClinica: valorClinica,                // Valor direto da clínica  
        percentualProfissional: percentualProfissional, // % do profissional
        percentualClinica: percentualClinica,      // % da clínica
      };
      
      if (editando) {
        const precoAtualizado = await updatePrecoServicoProfissional(editando.id, dadosPreco);
        setPrecos(prev => prev.map(p => p.id === editando.id ? precoAtualizado : p));
        const profissional = profissionais.find(p => p.id === form.profissionalId);
        const servico = servicos.find(s => s.id === form.servicoId);
        AppToast.updated('Preço', `Preço de ${profissional?.nome} para "${servico?.nome}" foi atualizado com sucesso.`);
      } else {
        const novoPreco = await createPrecoServicoProfissional(dadosPreco);
        setPrecos(prev => [...prev, novoPreco]);
        const profissional = profissionais.find(p => p.id === form.profissionalId);
        const servico = servicos.find(s => s.id === form.servicoId);
        AppToast.created('Preço', `Preço personalizado para ${profissional?.nome} no serviço "${servico?.nome}" foi criado com sucesso.`);
      }
      
      fecharModal();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      
      if (error?.response?.status === 403) {
        // Erro de permissão será tratado pelo interceptor
        return;
      }
      
      let title = 'Erro ao salvar preço';
      let description = 'Não foi possível salvar o preço personalizado. Verifique os dados e tente novamente.';
      
      if (error?.response?.data?.message) {
        description = error.response.data.message;
      } else if (error?.message) {
        description = error.message;
      }
      
      setFormError(description);
      AppToast.error(title, { description });
    } finally {
      setFormLoading(false);
    }
  };

  const confirmarExclusao = (preco: PrecoServicoProfissional) => {
    setExcluindo(preco);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    
    setDeleteLoading(true);
    try {
      await deletePrecoServicoProfissional(excluindo.id);
      setPrecos(prev => prev.filter(p => p.id !== excluindo.id));
      
      const profissional = profissionais.find(p => p.id === excluindo.profissionalId);
      const servico = servicos.find(s => s.id === excluindo.servicoId);
      AppToast.deleted('Preço', `Preço personalizado de ${profissional?.nome} para "${servico?.nome}" foi excluído permanentemente.`);
      
      setExcluindo(null);
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      
      if (error?.response?.status === 403) {
        // Erro de permissão será tratado pelo interceptor
        return;
      }
      
      AppToast.error('Erro ao excluir preço', {
        description: 'Não foi possível excluir o preço personalizado. Tente novamente ou entre em contato com o suporte.'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const obterPercentualAtual = (precoItem: PrecoServicoProfissional) => {
    // Agora usamos o campo percentualProfissional que armazena o percentual
    return precoItem.percentualProfissional || 0;
  };

  const calcularValorEmReais = (precoItem: PrecoServicoProfissional, tipo: 'profissional' | 'clinica') => {
    if (tipo === 'profissional') {
      return precoItem.precoProfissional || 0; // Agora é valor direto
    } else {
      return precoItem.precoClinica || 0; // Agora é valor direto
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando preços...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer>
        {/* Header da página */}
        <PageHeader title="Preços Serviços Profissionais" module="servicos" icon="💼">
          <SearchBar
            placeholder="Buscar por profissional ou serviço..."
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
              Novo Preço
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
                      Novo Preço
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para criar preços personalizados</p>
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
                  <p>Você não tem permissão para visualizar preços personalizados</p>
                )}
              </div>
            </div>
          ) : viewMode === 'table' ? (
            <ResponsiveTable 
              data={precosPaginados}
              columns={columns}
              module="servicos"
              emptyMessage="Nenhum preço personalizado encontrado"
              isLoadingMore={isLoadingMore}
              hasNextPage={hasNextPage}
              isMobile={isMobile}
              scrollRef={targetRef}
            />
          ) : (
            <ResponsiveCards 
              data={precosPaginados}
              renderCard={renderCard}
              emptyMessage="Nenhum preço personalizado encontrado"
              emptyIcon="💼"
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
      </PageContainer>

      {/* Modal de Criação/Edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <DialogHeader className="flex-shrink-0 bg-gradient-to-r from-indigo-50 to-purple-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-2xl">💼</span>
                {editando ? 'Editar Preço Personalizado' : 'Novo Preço Personalizado'}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profissional <span className="text-red-500">*</span>
                  </label>
                  <div className={`${formLoading || !!editando ? 'opacity-50 pointer-events-none' : ''}`}>
                    <SingleSelectDropdown
                      options={profissionais
                        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
                        .map(p => ({ id: p.id, nome: p.nome }))}
                      selected={profissionais.find(p => p.id === form.profissionalId) ? { id: form.profissionalId, nome: profissionais.find(p => p.id === form.profissionalId)!.nome } : null}
                      onChange={(selected) => setForm(f => ({ ...f, profissionalId: selected?.id || '', servicoId: '' }))}
                      placeholder="Selecione o profissional"
                      headerText="Profissionais disponíveis"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serviço <span className="text-red-500">*</span>
                    {form.profissionalId && (() => {
                      const profissionalSelecionado = profissionais.find(p => p.id === form.profissionalId);
                      
                      // Buscar pelos serviços vinculados
                      const servicosVinculados = servicos.filter(servico => {
                        if (profissionalSelecionado?.servicosIds?.includes(servico.id)) return true;
                        if (profissionalSelecionado?.servicos?.some(s => s.id === servico.id)) return true;
                        return false;
                      });

                      // Verificar quantos já têm preço personalizado
                      const servicosComPrecoPersonalizado = servicosVinculados.filter(servico => {
                        return precos.some(p => 
                          p.profissionalId === form.profissionalId && 
                          p.servicoId === servico.id &&
                          (!editando || p.id !== editando.id)
                        );
                      }).length;

                      const servicosDisponiveis = servicosVinculados.length - servicosComPrecoPersonalizado;

                      if (servicosVinculados.length > 0) {
                        return (
                          <span className="text-xs text-gray-500 font-normal ml-2">
                            ({servicosDisponiveis} disponíveis de {servicosVinculados.length})
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </label>
                  <div className={`${formLoading || !!editando || !form.profissionalId ? 'opacity-50 pointer-events-none' : ''}`}>
                    {(() => {
                      if (!form.profissionalId) {
                        return (
                          <div className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 min-h-[44px] bg-gray-50 text-gray-500">
                            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm">Selecione primeiro o profissional</span>
                          </div>
                        );
                      }

                      const profissionalSelecionado = profissionais.find(p => p.id === form.profissionalId);
                      
                      // Buscar pelos serviços vinculados
                      const servicosVinculados = servicos.filter(servico => {
                        if (profissionalSelecionado?.servicosIds?.includes(servico.id)) return true;
                        if (profissionalSelecionado?.servicos?.some(s => s.id === servico.id)) return true;
                        return false;
                      });

                      if (servicosVinculados.length === 0) {
                        return (
                          <div className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 min-h-[44px] bg-orange-50 text-orange-600">
                            <Search className="w-4 h-4 text-orange-400 flex-shrink-0" />
                            <span className="text-sm">Nenhum serviço vinculado a este profissional</span>
                          </div>
                        );
                      }

                      // Filtrar serviços disponíveis (que não têm preço personalizado ainda)
                      const servicosDisponiveis = servicosVinculados.filter(servico => {
                        return !precos.some(p => 
                          p.profissionalId === form.profissionalId && 
                          p.servicoId === servico.id &&
                          (!editando || p.id !== editando.id)
                        );
                      });

                      // Se todos os serviços já têm preço personalizado
                      if (servicosDisponiveis.length === 0 && !editando) {
                        return (
                          <div className="w-full border-2 border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 min-h-[44px] bg-amber-50 text-amber-600">
                            <Search className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <span className="text-sm">Todos os serviços já possuem preços personalizados</span>
                          </div>
                        );
                      }

                      // Para edição, mostrar todos os serviços vinculados
                      const servicosParaExibir = editando ? servicosVinculados : servicosDisponiveis;

                      return (
                        <SingleSelectDropdown
                          options={servicosParaExibir
                            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
                            .map(s => ({ 
                              id: s.id, 
                              nome: `${s.nome} - ${formatarMoeda(s.preco)}` 
                            }))}
                          selected={servicos.find(s => s.id === form.servicoId) ? { 
                            id: form.servicoId, 
                            nome: `${servicos.find(s => s.id === form.servicoId)!.nome} - ${formatarMoeda(servicos.find(s => s.id === form.servicoId)!.preco)}` 
                          } : null}
                          onChange={(selected) => setForm(f => ({ ...f, servicoId: selected?.id || '' }))}
                          placeholder="Selecione o serviço"
                          headerText="Serviços disponíveis"
                        />
                      );
                    })()}
                  </div>
                </div>
              </div>

              {form.servicoId && (
                <>
                  {/* Informações do Serviço Selecionado - Compacto */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="text-lg">📋</span>
                      Dados do Serviço Selecionado
                    </h4>
                    {(() => {
                      const servicoSelecionado = servicos.find(s => s.id === form.servicoId);
                      if (!servicoSelecionado) return null;

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                          <div className="text-center p-2 bg-white rounded-lg border border-blue-100">
                            <p className="text-xs text-gray-600">Preço Base</p>
                            <p className="font-bold text-green-600 text-sm">{formatarMoeda(servicoSelecionado.preco)}</p>
                          </div>
                          <div className="text-center p-2 bg-white rounded-lg border border-blue-100">
                            <p className="text-xs text-gray-600">Valor Prof. Padrão</p>
                            <p className="font-bold text-blue-700 text-sm">{formatarMoeda((servicoSelecionado.preco * (servicoSelecionado.percentualProfissional || 0)) / 100)}</p>
                          </div>
                          <div className="text-center p-2 bg-white rounded-lg border border-blue-100">
                            <p className="text-xs text-gray-600">Valor Clín. Padrão</p>
                            <p className="font-bold text-purple-700 text-sm">{formatarMoeda((servicoSelecionado.preco * (servicoSelecionado.percentualClinica || 0)) / 100)}</p>
                          </div>
                          <div className="text-center p-2 bg-white rounded-lg border border-blue-100">
                            <p className="text-xs text-gray-600">% Prof. Padrão</p>
                            <p className="font-bold text-blue-600 text-sm">{(servicoSelecionado.percentualProfissional || 0).toFixed(1)}%</p>
                          </div>
                          <div className="text-center p-2 bg-white rounded-lg border border-blue-100">
                            <p className="text-xs text-gray-600">% Clín. Padrão</p>
                            <p className="font-bold text-purple-600 text-sm">{(servicoSelecionado.percentualClinica || 0).toFixed(1)}%</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Configurar Percentuais Personalizados */}
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border-2 border-yellow-200">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <span className="text-lg">💰</span>
                          Valor Profissional Personalizado <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
                          <input
                            type="text"
                            value={form.valorProfissional}
                            onChange={(e) => {
                              const valorFormatado = formatarMoedaInput(e.target.value);
                              setForm(f => ({ ...f, valorProfissional: valorFormatado }));
                            }}
                            className="w-full pl-10 pr-4 py-3 border-2 border-yellow-300 rounded-xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-500 transition-all duration-200 font-semibold text-lg text-gray-800 bg-white hover:border-yellow-400"
                            placeholder="0,00"
                            disabled={formLoading}
                          />
                        </div>
                      </div>
                    </div>

                    {form.servicoId && form.valorProfissional && valorProfissionalNumerico > 0 && (
                      <div className="mt-2 pt-2">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {(() => {
                            const { percentualProfissional, percentualClinica } = calcularPercentuais(form.servicoId, valorProfissionalNumerico);
                            const servico = servicos.find(s => s.id === form.servicoId);
                            const valorClinica = servico ? servico.preco - valorProfissionalNumerico : 0;
                            
                            return (
                              <>
                                <div className="text-center p-2 bg-white rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-600">Preço Base</p>
                                  <p className="font-bold text-green-600 text-sm">
                                    {formatarMoeda(servico?.preco || 0)}
                                  </p>
                                </div>
                                <div className="text-center p-2 bg-white rounded-lg border border-blue-200">
                                  <p className="text-xs text-gray-600">Valor Prof.</p>
                                  <p className="font-bold text-blue-600 text-sm">
                                    {formatarMoeda(valorProfissionalNumerico)}
                                  </p>
                                </div>
                                <div className="text-center p-2 bg-white rounded-lg border border-purple-200">
                                  <p className="text-xs text-gray-600">Valor Clín.</p>
                                  <p className="font-bold text-purple-600 text-sm">
                                    {formatarMoeda(Math.max(0, valorClinica))}
                                  </p>
                                </div>
                                <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200">
                                  <p className="text-xs text-gray-600">% Prof.</p>
                                  <p className="font-bold text-blue-700 text-sm">
                                    {percentualProfissional.toFixed(1)}%
                                  </p>
                                </div>
                                <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200">
                                  <p className="text-xs text-gray-600">% Clín.</p>
                                  <p className="font-bold text-purple-700 text-sm">
                                    {percentualClinica.toFixed(1)}%
                                  </p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
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

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDeleteModal
        open={!!excluindo}
        onClose={() => setExcluindo(null)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão de Preço Personalizado"
        entityName={
          excluindo 
            ? `${profissionais.find(p => p.id === excluindo.profissionalId)?.nome} - ${servicos.find(s => s.id === excluindo.servicoId)?.nome}`
            : ''
        }
        entityType="preço personalizado"
        isLoading={deleteLoading}
        loadingText="Excluindo preço personalizado..."
        confirmText="Excluir Preço"
      />
    </>
  );
}
