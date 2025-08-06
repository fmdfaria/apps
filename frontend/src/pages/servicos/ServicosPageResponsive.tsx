import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast, toast } from '@/components/ui/use-toast';
import { getServicos, createServico, updateServico, deleteServico } from '@/services/servicos';
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

export const ServicosPageResponsive = () => {
  const [servicos, setServicos] = useState<ServicoAPI[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
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
        <span className="text-sm font-medium text-blue-600">
          {item.percentualClinica != null && item.preco != null 
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
        <span className="text-sm font-medium text-emerald-600">
          {item.percentualProfissional != null && item.preco != null 
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
      key: 'actions',
      header: '⚙️ Ações',
      essential: true,
      render: (item) => (
        <div className="flex gap-1.5">
          <ActionButton
            variant="view"
            module="servicos"
            onClick={() => abrirModalEditar(item)}
            title="Editar Serviço"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant="delete"
            module="servicos"
            onClick={() => confirmarExclusao(item)}
            title="Excluir Serviço"
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
      valorClinica: servico.percentualClinica != null && servico.preco != null 
        ? (servico.percentualClinica / 100) * servico.preco 
        : 0,
      valorProfissional: servico.percentualProfissional != null && servico.preco != null 
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
  }, []);

  const fetchServicos = async () => {
    setLoading(true);
    try {
      const data = await getServicos();
      setServicos(data);
    } catch (e) {
      toast({ title: 'Erro ao carregar serviços', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchConvenios = async () => {
    try {
      const data = await getConvenios();
      setConvenios(data);
    } catch (e) {
      toast({ title: 'Erro ao carregar convênios', variant: 'destructive' });
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
          {servico.convenio && (() => {
            const colors = getConvenioColor(servico.convenio.id);
            return (
              <Badge className={`text-xs flex-shrink-0 ml-2 ${colors.bg} ${colors.text}`}>
                {servico.convenio.nome}
              </Badge>
            );
          })()}
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
                  <span className="text-blue-600 font-medium">
                    {((servico.percentualClinica / 100) * servico.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                  <span className="text-emerald-600 font-medium">
                    {((servico.percentualProfissional / 100) * servico.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <ResponsiveCardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-green-300 text-green-600 hover:bg-green-600 hover:text-white"
          onClick={() => abrirModalEditar(servico)}
          title="Editar serviço"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
          onClick={() => confirmarExclusao(servico)}
          title="Excluir serviço"
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
      const payload = { ...form, duracaoMinutos: duracaoNumber, preco: precoNumber, convenioId: form.convenioId };
      if (editando) {
        await updateServico(editando.id, payload);
        toast({ title: 'Serviço atualizado com sucesso', variant: 'success' });
      } else {
        await createServico(payload);
        toast({ title: 'Serviço criado com sucesso', variant: 'success' });
      }
      fecharModal();
      fetchServicos();
    } catch (e: any) {
      let msg = 'Erro ao salvar serviço';
      if (e?.response?.data?.message) {
        msg = e.response.data.message;
      } else if (e?.message) {
        msg = e.message;
      }
      toast({ title: msg, variant: 'destructive' });
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
      toast({ title: 'Serviço excluído com sucesso', variant: 'success' });
      setExcluindo(null);
      fetchServicos();
    } catch (e) {
      toast({ title: 'Erro ao excluir serviço', variant: 'destructive' });
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
        
        <Button 
          className="!h-10 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
          onClick={abrirModalNovo}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Serviço
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
          module="servicos"
        />

        {/* Conteúdo baseado no modo de visualização */}
        {viewMode === 'table' ? (
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
                  <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold">Convênio</span>
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
                  <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold">Nome do Serviço</span>
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
                  <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold">Descrição</span>
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
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold">Duração (min)</span>
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
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold">Preço (R$)</span>
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
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold">Valor Clínica</span>
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
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold">Valor Profissional</span>
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
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold">Procedimento 1º Atendimento</span>
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
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold">Procedimento Demais Atendimentos</span>
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
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
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