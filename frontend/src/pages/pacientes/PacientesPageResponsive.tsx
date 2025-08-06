import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Paperclip, Building2, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast, toast } from '@/components/ui/use-toast';
import { getPacientes, createPaciente, updatePaciente, deletePaciente } from '@/services/pacientes';
import { getConvenios } from '@/services/convenios';
import type { Paciente } from '@/types/Paciente';
import type { Convenio } from '@/types/Convenio';

// Modais existentes
import PacienteModal from './PacienteModal';
import AnexoPacientesModal from './AnexoPacientesModal';
import ConvenioModal from './ConvenioModal';
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
import { getModuleTheme } from '@/types/theme';
import { useInputMask } from '@/hooks/useInputMask';
import { getAnexos } from '@/services/anexos';
import type { Anexo } from '@/types/Anexo';

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

export const PacientesPageResponsive = () => {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [convenios, setConvenios] = useState<Convenio[]>([]);

  // Estados dos modais existentes
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Paciente | null>(null);
  const [form, setForm] = useState({
    nomeCompleto: '',
    cpf: '',
    email: '',
    whatsapp: '',
    dataNascimento: '',
    tipoServico: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Estados para modal de anexo
  const [showAnexoModal, setShowAnexoModal] = useState(false);
  const [pacienteAnexo, setPacienteAnexo] = useState<Paciente | null>(null);
  const [anexoFiles, setAnexoFiles] = useState<File[]>([]);
  const [anexoDescricao, setAnexoDescricao] = useState('');
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [anexoError, setAnexoError] = useState('');
  const [anexoToDelete, setAnexoToDelete] = useState<Anexo | null>(null);
  const [deletingAnexo, setDeletingAnexo] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados para modal de convênio
  const [showConvenioModal, setShowConvenioModal] = useState(false);
  const [pacienteConvenio, setPacienteConvenio] = useState<Paciente | null>(null);
  const [formConvenio, setFormConvenio] = useState({
    convenioId: '',
    numeroCarteirinha: '',
    dataPedidoMedico: '',
    crm: '',
    cbo: '',
    cid: '',
  });
  const [formConvenioError, setFormConvenioError] = useState('');
  const [formConvenioLoading, setFormConvenioLoading] = useState(false);
  
  const [excluindo, setExcluindo] = useState<Paciente | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const maskTelefone = useInputMask('+99 (99) 99999-9999');

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'pacientes-view' });
  
  // Configuração das colunas da tabela
  const columns: TableColumn<Paciente>[] = [
    {
      key: 'nomeCompleto',
      header: '👤 Nome',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome do paciente...',
        label: 'Nome'
      },
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {item.nomeCompleto.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{item.nomeCompleto}</span>
        </div>
      )
    },
    {
      key: 'cpf',
      header: '📄 CPF',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'CPF do paciente...',
        label: 'CPF'
      },
      render: (item) => <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{formatCPF(item.cpf || '')}</span>
    },
    {
      key: 'email',
      header: '📧 Email',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Email do paciente...',
        label: 'Email'
      },
      render: (item) => <span className="text-sm text-rose-600">{item.email || '-'}</span>
    },
    {
      key: 'whatsapp',
      header: '📱 WhatsApp',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'WhatsApp do paciente...',
        label: 'WhatsApp'
      },
      render: (item) => (
        <span className="text-sm font-mono bg-green-100 px-2 py-1 rounded text-green-700">
          {item.whatsapp ? formatWhatsApp(item.whatsapp) : '-'}
        </span>
      )
    },
    {
      key: 'dataNascimento',
      header: '🎂 Data Nasc.',
      essential: true,
      render: (item) => (
        <span className="text-sm">
          {item.dataNascimento ? new Date(item.dataNascimento).toLocaleDateString('pt-BR') : '-'}
        </span>
      )
    },
    {
      key: 'tipoServico',
      header: '💼 Tipo Serviço',
      essential: true,
      filterable: {
        type: 'select',
        options: [
          { value: 'Particular', label: 'Particular' },
          { value: 'Convênio', label: 'Convênio' }
        ],
        label: 'Tipo de Serviço'
      },
      render: (item) => (
        <Badge 
          variant="outline" 
          className={`text-xs ${
            item.tipoServico === 'Convênio' 
              ? 'bg-rose-50 text-rose-700 border-rose-200' 
              : 'bg-pink-50 text-pink-700 border-pink-200'
          }`}
        >
          {item.tipoServico || 'Particular'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: '⚙️ Ações',
      essential: true,
      render: (item) => (
        <div className="flex gap-1.5">
          <ActionButton
            variant="view"
            module="pacientes"
            onClick={() => abrirModalEditar(item)}
            title="Editar dados do paciente"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant="view"
            module="pacientes"
            onClick={() => abrirModalAnexo(item)}
            title="Gerenciar anexos"
          >
            <Paperclip className="w-4 h-4" />
          </ActionButton>
          {item.tipoServico === 'Convênio' ? (
            <ActionButton
              variant="view"
              module="pacientes"
              onClick={() => abrirModalConvenio(item)}
              title="Dados do convênio"
            >
              <Building2 className="w-4 h-4" />
            </ActionButton>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 border-gray-300 text-gray-400 cursor-not-allowed"
              disabled
              title="Paciente particular"
            >
              <Building2 className="w-4 h-4" />
            </Button>
          )}
          <ActionButton
            variant="delete"
            module="pacientes"
            onClick={() => setExcluindo(item)}
            title="Excluir paciente"
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
  const pacientesFiltrados = useMemo(() => {
    // Função para normalizar texto
    const normalizarBusca = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normalizarTelefone = (tel: string) => tel.replace(/\D/g, '');

    // Primeiro aplicar busca textual
    let dadosFiltrados = pacientes.filter(p => {
      if (busca.trim() === '') return true;
      
      const buscaNormalizada = normalizarBusca(busca);
      const nome = normalizarBusca(p.nomeCompleto);
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
    }).sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR', { sensitivity: 'base' }));
    
    // Depois aplicar filtros dinâmicos
    return applyFilters(dadosFiltrados);
  }, [pacientes, busca, applyFilters]);

  const {
    data: pacientesPaginados,
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
  } = useResponsiveTable(pacientesFiltrados, 10);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pacientesData, conveniosData] = await Promise.all([
        getPacientes(),
        getConvenios()
      ]);
      
      setPacientes(pacientesData);
      setConvenios(conveniosData);
    } catch (e) {
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Funções dos modais existentes
  const abrirModalNovo = () => {
    setEditando(null);
    setForm({ nomeCompleto: '', cpf: '', email: '', whatsapp: '', dataNascimento: '', tipoServico: '' });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = async (p: Paciente) => {
    setEditando(p);
    setForm({
      nomeCompleto: p.nomeCompleto || '',
      cpf: p.cpf || '',
      email: p.email || '',
      whatsapp: maskTelefone(p.whatsapp || ''),
      dataNascimento: p.dataNascimento ? p.dataNascimento.substring(0, 10) : '',
      tipoServico: p.tipoServico || 'Particular',
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({ nomeCompleto: '', cpf: '', email: '', whatsapp: '', dataNascimento: '', tipoServico: '' });
    setFormError('');
  };

  const handleFormChange = (updates: Partial<typeof form>) => {
    setForm(f => ({ ...f, ...updates }));
  };

  const abrirModalAnexo = async (p: Paciente) => {
    setPacienteAnexo(p);
    setAnexoFiles([]);
    setAnexoDescricao('');
    setAnexoError('');
    setAnexos([]);
    setShowAnexoModal(true);
    // Buscar anexos reais
    try {
      const anexosDb = await getAnexos(p.id);
      setAnexos(anexosDb);
    } catch (e) {
      setAnexos([]);
    }
  };

  const fecharModalAnexo = () => {
    setShowAnexoModal(false);
    setPacienteAnexo(null);
    setAnexoFiles([]);
    setAnexoDescricao('');
    setAnexoError('');
    setAnexos([]);
  };

  const abrirModalConvenio = async (p: Paciente) => {
    setPacienteConvenio(p);
    setFormConvenio({
      convenioId: p.convenioId || '',
      numeroCarteirinha: p.numeroCarteirinha || '',
      dataPedidoMedico: p.dataPedidoMedico ? p.dataPedidoMedico.substring(0, 10) : '',
      crm: p.crm || '',
      cbo: p.cbo || '',
      cid: p.cid || '',
    });
    setFormConvenioError('');
    setShowConvenioModal(true);
  };

  const fecharModalConvenio = () => {
    setShowConvenioModal(false);
    setPacienteConvenio(null);
    setFormConvenio({
      convenioId: '',
      numeroCarteirinha: '',
      dataPedidoMedico: '',
      crm: '',
      cbo: '',
      cid: '',
    });
    setFormConvenioError('');
  };

  const handleFormConvenioChange = (updates: Partial<typeof formConvenio>) => {
    setFormConvenio(f => ({ ...f, ...updates }));
  };

  // Renderização do card
  const renderCard = (paciente: Paciente) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {paciente.nomeCompleto.charAt(0).toUpperCase()}
            </div>
            <CardTitle className="text-sm font-medium truncate">{paciente.nomeCompleto}</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs ml-2 flex-shrink-0 ${
              paciente.tipoServico === 'Convênio' 
                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                : 'bg-pink-50 text-pink-700 border-pink-200'
            }`}
          >
            {paciente.tipoServico || 'Particular'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2 mb-3">
          <CardDescription className="line-clamp-1 text-xs">
            📧 <span className="text-rose-600">{paciente.email || 'Não informado'}</span>
          </CardDescription>
          
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span>📄</span>
              <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-700">
                {formatCPF(paciente.cpf || '')}
              </span>
            </div>
            
            {paciente.whatsapp && (
              <div className="flex items-center gap-1">
                <span>📱</span>
                <span className="font-mono bg-green-100 px-1 py-0.5 rounded text-green-700">
                  {formatWhatsApp(paciente.whatsapp)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <span>🎂</span>
              <span>{paciente.dataNascimento ? new Date(paciente.dataNascimento).toLocaleDateString('pt-BR') : 'Não informado'}</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <ResponsiveCardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white"
          onClick={() => abrirModalEditar(paciente)}
          title="Editar dados do paciente"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white"
          onClick={() => abrirModalAnexo(paciente)}
          title="Gerenciar anexos"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        {paciente.tipoServico === 'Convênio' ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white"
            onClick={() => abrirModalConvenio(paciente)}
            title="Dados do convênio"
          >
            <Building2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="border-gray-300 text-gray-400 cursor-not-allowed"
            disabled
            title="Paciente particular"
          >
            <Building2 className="w-4 h-4" />
          </Button>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
          onClick={() => setExcluindo(paciente)}
          title="Excluir paciente"
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
      await deletePaciente(excluindo.id);
      toast({ title: 'Paciente excluído com sucesso', variant: 'success' });
      setExcluindo(null);
      fetchData();
    } catch (e) {
      toast({ title: 'Erro ao excluir paciente', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando pacientes...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header da página */}
      <PageHeader title="Pacientes" module="pacientes" icon="👥">
        <SearchBar
          placeholder="Buscar por nome, CPF, email ou WhatsApp..."
          value={busca}
          onChange={setBusca}
          module="pacientes"
        />
        
        <FilterButton
          showFilters={mostrarFiltros}
          onToggleFilters={() => setMostrarFiltros(prev => !prev)}
          activeFiltersCount={activeFiltersCount}
          module="pacientes"
          disabled={filterConfigs.length === 0}
        />
        
        <ViewToggle 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
          module="pacientes"
        />
        
        <Button 
          className={`!h-10 bg-gradient-to-r ${getModuleTheme('pacientes').primaryButton} ${getModuleTheme('pacientes').primaryButtonHover} shadow-lg hover:shadow-xl transition-all duration-200 font-semibold`}
          onClick={abrirModalNovo}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Paciente
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
          module="pacientes"
        />

        {/* Conteúdo baseado no modo de visualização */}
        {viewMode === 'table' ? (
          <ResponsiveTable 
            data={pacientesPaginados}
            columns={columns}
            module="pacientes"
            emptyMessage="Nenhum paciente encontrado"
            isLoadingMore={isLoadingMore}
            hasNextPage={hasNextPage}
            isMobile={isMobile}
            scrollRef={targetRef}
          />
        ) : (
          <ResponsiveCards 
            data={pacientesPaginados}
            renderCard={renderCard}
            emptyMessage="Nenhum paciente encontrado"
            emptyIcon="👥"
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
          module="pacientes"
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Modais existentes */}
      <PacienteModal
        showModal={showModal}
        editando={editando}
        form={form}
        formError={formError}
        formLoading={formLoading}
        onClose={fecharModal}
        onSubmit={async (e) => {
          e.preventDefault();
          
          // Validação
          if (!form.nomeCompleto.trim() || form.nomeCompleto.trim().length < 2) {
            setFormError('O nome deve ter pelo menos 2 caracteres.');
            return;
          }
          if (!form.cpf.trim() || form.cpf.length < 14) {
            setFormError('CPF inválido. Exemplo: xxx.xxx.xxx-xx.');
            return;
          }
          if (!form.email.trim() || !form.email.includes('@')) {
            setFormError('E-mail inválido. Exemplo: nome@email.com');
            return;
          }
          if (!form.dataNascimento) {
            setFormError('Informe a data de nascimento.');
            return;
          }
          if (!form.tipoServico) {
            setFormError('Selecione o tipo de serviço.');
            return;
          }
          const telefoneValido = /^\+55 \(\d{2}\) \d{5}-\d{4}$/.test(form.whatsapp.trim());
          if (!telefoneValido) {
            setFormError('Telefone inválido. Exemplo: +55 (12) 99999-9999');
            return;
          }

          setFormLoading(true);
          setFormError('');
          const whatsappNumeros = form.whatsapp.replace(/\D/g, '');
          const pacientePayload: any = {
            nomeCompleto: form.nomeCompleto,
            cpf: form.cpf,
            email: form.email || null,
            whatsapp: whatsappNumeros || null,
            dataNascimento: form.dataNascimento,
            tipoServico: form.tipoServico,
          };

          try {
            if (editando) {
              await updatePaciente(editando.id, pacientePayload);
              toast({ title: 'Paciente atualizado com sucesso', variant: 'success' });
            } else {
              await createPaciente(pacientePayload);
              toast({ title: 'Paciente criado com sucesso', variant: 'success' });
            }
            await fetchData();
            fecharModal();
          } catch (err: any) {
            let msg = 'Erro ao salvar paciente.';
            if (err?.response?.data?.message) msg = err.response.data.message;
            else if (err?.response?.data?.error) msg = err.response.data.error;
            setFormError(msg);
          } finally {
            setFormLoading(false);
          }
        }}
        onFormChange={handleFormChange}
      />
      
      <AnexoPacientesModal
        showModal={showAnexoModal}
        paciente={pacienteAnexo}
        anexoFiles={anexoFiles}
        anexoDescricao={anexoDescricao}
        anexos={anexos}
        anexoError={anexoError}
        saving={saving}
        anexoToDelete={anexoToDelete}
        deletingAnexo={deletingAnexo}
        onClose={fecharModalAnexo}
        onAnexoFilesChange={setAnexoFiles}
        onAnexoDescricaoChange={setAnexoDescricao}
        onAnexosChange={setAnexos}
        onAnexoErrorChange={setAnexoError}
        onSavingChange={setSaving}
        onAnexoToDeleteChange={setAnexoToDelete}
        onDeletingAnexoChange={setDeletingAnexo}
      />
      
      <ConvenioModal
        showModal={showConvenioModal}
        paciente={pacienteConvenio}
        form={formConvenio}
        formError={formConvenioError}
        formLoading={formConvenioLoading}
        convenios={convenios}
        onClose={fecharModalConvenio}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!pacienteConvenio) return;
          
          // Validação
          if (!formConvenio.convenioId.trim()) {
            setFormConvenioError('Selecione um convênio.');
            return;
          }
          if (!formConvenio.numeroCarteirinha.trim()) {
            setFormConvenioError('Número da carteirinha é obrigatório.');
            return;
          }
          if (!formConvenio.dataPedidoMedico) {
            setFormConvenioError('Data do pedido médico é obrigatória.');
            return;
          }
          if (!formConvenio.crm.trim()) {
            setFormConvenioError('CRM é obrigatório.');
            return;
          }
          if (!formConvenio.cbo.trim()) {
            setFormConvenioError('CBO é obrigatório.');
            return;
          }
          if (!formConvenio.cid.trim()) {
            setFormConvenioError('CID é obrigatório.');
            return;
          }

          setFormConvenioLoading(true);
          setFormConvenioError('');

          const convenioPayload = {
            nomeCompleto: pacienteConvenio.nomeCompleto,
            cpf: pacienteConvenio.cpf,
            email: pacienteConvenio.email,
            whatsapp: pacienteConvenio.whatsapp,
            dataNascimento: pacienteConvenio.dataNascimento,
            tipoServico: pacienteConvenio.tipoServico,
            convenioId: formConvenio.convenioId,
            numeroCarteirinha: formConvenio.numeroCarteirinha,
            dataPedidoMedico: formConvenio.dataPedidoMedico,
            crm: formConvenio.crm,
            cbo: formConvenio.cbo,
            cid: formConvenio.cid,
          };

          try {
            await updatePaciente(pacienteConvenio.id, convenioPayload);
            toast({ title: 'Dados do convênio atualizados com sucesso', variant: 'success' });
            await fetchData();
            fecharModalConvenio();
          } catch (err: any) {
            let msg = 'Erro ao salvar dados do convênio.';
            if (err?.response?.data?.message) msg = err.response.data.message;
            else if (err?.response?.data?.error) msg = err.response.data.error;
            setFormConvenioError(msg);
          } finally {
            setFormConvenioLoading(false);
          }
        }}
        onFormChange={handleFormConvenioChange}
      />
      
      {/* Modal de confirmação de exclusão */}
      <ConfirmDeleteModal
        open={!!excluindo}
        onClose={() => setExcluindo(null)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão de Paciente"
        entityName={excluindo?.nomeCompleto || ''}
        entityType="paciente"
        isLoading={deleteLoading}
        loadingText="Excluindo paciente..."
        confirmText="Excluir Paciente"
      />
    </PageContainer>
  );
};