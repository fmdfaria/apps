import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast, toast } from '@/components/ui/use-toast';
import { getConselhos, createConselho, updateConselho, deleteConselho, ConselhoProfissional } from '@/services/conselhos';
import { FormErrorMessage } from '@/components/form-error-message';
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
  TableColumn 
} from '@/components/layout';
import { useViewMode } from '@/hooks/useViewMode';
import { useResponsiveTable } from '@/hooks/useResponsiveTable';
import { useTableFilters } from '@/hooks/useTableFilters';

// Definir tipo de formulário separado
interface FormularioConselho {
  sigla: string;
  nome: string;
}

export const ConselhosPageResponsive = () => {
  const [conselhos, setConselhos] = useState<ConselhoProfissional[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<ConselhoProfissional | null>(null);
  const [form, setForm] = useState<FormularioConselho>({
    sigla: '',
    nome: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<ConselhoProfissional | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'conselhos-view' });
  
  // Configuração das colunas da tabela com filtros dinâmicos
  const columns: TableColumn<ConselhoProfissional>[] = [
    {
      key: 'sigla',
      header: '🏛️ Sigla',
      essential: true,
      className: 'font-mono',
      filterable: {
        type: 'text',
        placeholder: 'Sigla do conselho...',
        label: 'Sigla'
      },
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-cyan-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {item.sigla.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium font-mono bg-indigo-100 px-2 py-1 rounded text-indigo-700">
            {item.sigla}
          </span>
        </div>
      )
    },
    {
      key: 'nome',
      header: '⚖️ Nome',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome do conselho...',
        label: 'Nome'
      },
      render: (item) => <span className="text-sm font-medium">{item.nome}</span>
    },
    {
      key: 'actions',
      header: '⚙️ Ações',
      essential: true,
      render: (item) => (
        <div className="flex gap-1.5">
          <ActionButton
            variant="edit"
            module="conselhos"
            onClick={() => abrirModalEditar(item)}
            title="Editar Conselho"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant="delete"
            module="conselhos"
            onClick={() => confirmarExclusao(item)}
            title="Excluir Conselho"
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
  const conselhosFiltrados = useMemo(() => {
    // Primeiro aplicar busca textual
    let dadosFiltrados = conselhos.filter(c =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.sigla.toLowerCase().includes(busca.toLowerCase())
    );
    
    // Depois aplicar filtros dinâmicos
    return applyFilters(dadosFiltrados);
  }, [conselhos, busca, applyFilters]);

  const {
    data: conselhosPaginados,
    totalItems,
    currentPage,
    itemsPerPage,
    totalPages,
    handlePageChange,
    handleItemsPerPageChange
  } = useResponsiveTable(conselhosFiltrados, 10);

  useEffect(() => {
    fetchConselhos();
  }, []);

  const fetchConselhos = async () => {
    setLoading(true);
    try {
      const data = await getConselhos();
      setConselhos(data);
    } catch (e) {
      toast({ title: 'Erro ao carregar conselhos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Renderização do card
  const renderCard = (conselho: ConselhoProfissional) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">⚖️</span>
            <CardTitle className="text-sm font-medium truncate">{conselho.nome}</CardTitle>
          </div>
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-cyan-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {conselho.sigla.charAt(0).toUpperCase()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Sigla:</span>
            <span className="text-xs font-mono bg-indigo-100 px-2 py-1 rounded text-indigo-700">
              {conselho.sigla}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 px-3 pb-3">
        <div className="flex items-center gap-2 w-full">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-7 text-xs border-indigo-300 text-indigo-600 hover:bg-indigo-600 hover:text-white"
            onClick={() => abrirModalEditar(conselho)}
          >
            <Edit className="w-3 h-3 mr-1" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-7 text-xs border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
            onClick={() => confirmarExclusao(conselho)}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Excluir
          </Button>
        </div>
      </CardFooter>
    </Card>
  );

  // Funções de manipulação
  const abrirModalNovo = () => {
    setEditando(null);
    setForm({
      sigla: '',
      nome: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (c: ConselhoProfissional) => {
    setEditando(c);
    setForm({
      sigla: c.sigla,
      nome: c.nome,
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      sigla: '',
      nome: '',
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sigla.trim() || form.sigla.trim().length < 2) {
      setFormError('A sigla deve ter pelo menos 2 caracteres.');
      return;
    }
    if (!form.nome.trim() || form.nome.trim().length < 3) {
      setFormError('O nome deve ter pelo menos 3 caracteres.');
      return;
    }
    setFormLoading(true);
    try {
      if (editando) {
        await updateConselho(editando.id, { sigla: form.sigla.trim(), nome: form.nome.trim() });
        toast({ title: 'Conselho atualizado com sucesso', variant: 'success' });
      } else {
        await createConselho({ sigla: form.sigla.trim(), nome: form.nome.trim() });
        toast({ title: 'Conselho criado com sucesso', variant: 'success' });
      }
      fecharModal();
      fetchConselhos();
    } catch (e: any) {
      let msg = 'Erro ao salvar conselho';
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

  const confirmarExclusao = (c: ConselhoProfissional) => {
    setExcluindo(c);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteConselho(excluindo.id);
      toast({ title: 'Conselho excluído com sucesso', variant: 'success' });
      setExcluindo(null);
      fetchConselhos();
    } catch (e) {
      toast({ title: 'Erro ao excluir conselho', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando conselhos...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header da página */}
      <PageHeader title="Conselhos Profissionais" module="conselhos" icon="⚖️">
        <SearchBar
          placeholder="Buscar conselhos..."
          value={busca}
          onChange={setBusca}
          module="conselhos"
        />
        
        <FilterButton
          showFilters={mostrarFiltros}
          onToggleFilters={() => setMostrarFiltros(prev => !prev)}
          activeFiltersCount={activeFiltersCount}
          module="conselhos"
          disabled={filterConfigs.length === 0}
          tooltip={filterConfigs.length === 0 ? 'Nenhum filtro configurado' : undefined}
        />
        
        <ViewToggle 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
          module="conselhos"
        />
        
        <Button 
          className="!h-10 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
          onClick={abrirModalNovo}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Conselho
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
          module="conselhos"
        />

        {/* Conteúdo baseado no modo de visualização */}
        {viewMode === 'table' ? (
          <ResponsiveTable 
            data={conselhosPaginados}
            columns={columns}
            module="conselhos"
            emptyMessage="Nenhum conselho encontrado"
          />
        ) : (
          <ResponsiveCards 
            data={conselhosPaginados}
            renderCard={renderCard}
            emptyMessage="Nenhum conselho encontrado"
            emptyIcon="⚖️"
          />
        )}
      </PageContent>

      {/* Paginação */}
      {totalPages > 1 && (
        <ResponsivePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          module="conselhos"
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Modal de cadastro/edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Conselho' : 'Novo Conselho'}</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">🏛️</span>
                  <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent font-semibold">Sigla</span>
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={form.sigla}
                  onChange={e => setForm(f => ({ ...f, sigla: e.target.value }))}
                  disabled={formLoading}
                  autoFocus
                  minLength={2}
                  maxLength={10}
                  className="hover:border-indigo-300 focus:border-indigo-500 focus:ring-indigo-100"
                  placeholder="Ex: CRM, CRO, CREFITO"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">⚖️</span>
                  <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent font-semibold">Nome</span>
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  disabled={formLoading}
                  minLength={3}
                  className="hover:border-indigo-300 focus:border-indigo-500 focus:ring-indigo-100"
                  placeholder="Ex: Conselho Regional de Medicina"
                />
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
                className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
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
        title="Confirmar Exclusão de Conselho"
        entityName={excluindo?.nome || ''}
        entityType="conselho"
        isLoading={deleteLoading}
        loadingText="Excluindo conselho..."
        confirmText="Excluir Conselho"
      />
    </PageContainer>
  );
}; 