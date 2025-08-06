import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, MapPin, User, CreditCard, Building, List, UserCheck, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast, toast } from '@/components/ui/use-toast';
import { getProfissionais, deleteProfissional } from '@/services/profissionais';
import { getConvenios } from '@/services/convenios';
import { getServicos } from '@/services/servicos';
import { getEspecialidades } from '@/services/especialidades';
import type { Profissional } from '@/types/Profissional';
import type { Servico } from '@/types/Servico';
import type { Convenio } from '@/types/Convenio';
import type { Especialidade } from '@/types/Especialidade';

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

export const ProfissionaisPageResponsive = () => {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
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
      key: 'actions',
      header: '⚙️ Ações',
      essential: true,
      render: (item) => (
        <div className="flex gap-1.5">
          <ActionButton
            variant="view"
            module="profissionais"
            onClick={() => setModalEditar({ open: true, profissional: item })}
            title="Editar dados pessoais"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant="view"
            module="profissionais"
            onClick={() => setModalAtribuir({ open: true, profissional: item })}
            title="Atribuir serviços"
          >
            <List className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant="view"
            module="profissionais"
            onClick={() => setModalEndereco({ open: true, profissional: item })}
            title="Editar endereço"
          >
            <MapPin className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant="view"
            module="profissionais"
            onClick={() => setModalInfoProfissional({ open: true, profissional: item })}
            title="Informações profissionais"
          >
            <UserCheck className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant="view"
            module="profissionais"
            onClick={() => setModalDadosBancarios({ open: true, profissional: item })}
            title="Dados bancários"
          >
            <CreditCard className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant="view"
            module="profissionais"
            onClick={() => setModalEmpresaContrato({ open: true, profissional: item })}
            title="Empresa/Contrato"
          >
            <Building className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant="delete"
            module="profissionais"
            onClick={() => setExcluindo(item)}
            title="Excluir profissional"
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
  }, []);

  const fetchData = async () => {
    setLoading(true);
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
    } catch (e) {
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
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
      toast({ title: 'Profissional excluído com sucesso', variant: 'success' });
      setExcluindo(null);
      fetchData();
    } catch (e) {
      toast({ title: 'Erro ao excluir profissional', variant: 'destructive' });
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
        
        <Button 
          className="!h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
          onClick={() => setModalCriar(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Profissional
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
          module="profissionais"
        />

        {/* Conteúdo baseado no modo de visualização */}
        {viewMode === 'table' ? (
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
            toast({ title: 'Serviços atribuídos com sucesso', variant: 'success' });
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