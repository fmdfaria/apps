import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast, toast } from '@/components/ui/use-toast';
import { getConvenios, createConvenio, updateConvenio, deleteConvenio } from '@/services/convenios';
import type { Convenio } from '@/types/Convenio';
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
interface FormularioConvenio {
  nome: string;
}

export const ConveniosPageResponsive = () => {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Convenio | null>(null);
  const [form, setForm] = useState<FormularioConvenio>({
    nome: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<Convenio | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'convenios-view' });
  
  // Configuração das colunas da tabela com filtros dinâmicos
  const columns: TableColumn<Convenio>[] = [
    {
      key: 'nome',
      header: '🏥 Nome',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome do convênio...',
        label: 'Nome'
      },
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {item.nome.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{item.nome}</span>
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
            variant="edit"
            module="convenios"
            onClick={() => abrirModalEditar(item)}
            title="Editar Convênio"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant="delete"
            module="convenios"
            onClick={() => confirmarExclusao(item)}
            title="Excluir Convênio"
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
  const conveniosFiltrados = useMemo(() => {
    // Primeiro aplicar busca textual
    let dadosFiltrados = convenios.filter(c =>
      c.nome.toLowerCase().includes(busca.toLowerCase())
    );
    
    // Depois aplicar filtros dinâmicos
    return applyFilters(dadosFiltrados);
  }, [convenios, busca, applyFilters]);

  const {
    data: conveniosPaginados,
    totalItems,
    currentPage,
    itemsPerPage,
    totalPages,
    handlePageChange,
    handleItemsPerPageChange
  } = useResponsiveTable(conveniosFiltrados, 10);

  useEffect(() => {
    fetchConvenios();
  }, []);

  const fetchConvenios = async () => {
    setLoading(true);
    try {
      const data = await getConvenios();
      setConvenios(data);
    } catch (e) {
      toast({ title: 'Erro ao carregar convênios', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Renderização do card
  const renderCard = (convenio: Convenio) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">🏥</span>
            <CardTitle className="text-sm font-medium truncate">{convenio.nome}</CardTitle>
          </div>
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {convenio.nome.charAt(0).toUpperCase()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Convênio:</span>
            <span className="text-xs font-medium text-blue-700">
              {convenio.nome}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 px-3 pb-3">
        <div className="flex items-center gap-2 w-full">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-7 text-xs border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white"
            onClick={() => abrirModalEditar(convenio)}
          >
            <Edit className="w-3 h-3 mr-1" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-7 text-xs border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
            onClick={() => confirmarExclusao(convenio)}
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
      nome: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (c: Convenio) => {
    setEditando(c);
    setForm({
      nome: c.nome,
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      nome: '',
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || form.nome.trim().length < 2) {
      setFormError('O nome deve ter pelo menos 2 caracteres.');
      return;
    }
    setFormLoading(true);
    try {
      if (editando) {
        await updateConvenio(editando.id, { nome: form.nome.trim() });
        toast({ title: 'Convênio atualizado com sucesso', variant: 'success' });
      } else {
        await createConvenio({ nome: form.nome.trim() });
        toast({ title: 'Convênio criado com sucesso', variant: 'success' });
      }
      fecharModal();
      fetchConvenios();
    } catch (e: any) {
      let msg = 'Erro ao salvar convênio';
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

  const confirmarExclusao = (c: Convenio) => {
    setExcluindo(c);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteConvenio(excluindo.id);
      toast({ title: 'Convênio excluído com sucesso', variant: 'success' });
      setExcluindo(null);
      fetchConvenios();
    } catch (e) {
      toast({ title: 'Erro ao excluir convênio', variant: 'destructive' });
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
            <p className="text-gray-500">Carregando convênios...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header da página */}
      <PageHeader title="Convênios" module="convenios" icon="🏥">
        <SearchBar
          placeholder="Buscar convênios..."
          value={busca}
          onChange={setBusca}
          module="convenios"
        />
        
        <FilterButton
          showFilters={mostrarFiltros}
          onToggleFilters={() => setMostrarFiltros(prev => !prev)}
          activeFiltersCount={activeFiltersCount}
          module="convenios"
          disabled={filterConfigs.length === 0}
          tooltip={filterConfigs.length === 0 ? 'Nenhum filtro configurado' : undefined}
        />
        
        <ViewToggle 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
          module="convenios"
        />
        
        <Button 
          className="!h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
          onClick={abrirModalNovo}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Convênio
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
          module="convenios"
        />

        {/* Conteúdo baseado no modo de visualização */}
        {viewMode === 'table' ? (
          <ResponsiveTable 
            data={conveniosPaginados}
            columns={columns}
            module="convenios"
            emptyMessage="Nenhum convênio encontrado"
          />
        ) : (
          <ResponsiveCards 
            data={conveniosPaginados}
            renderCard={renderCard}
            emptyMessage="Nenhum convênio encontrado"
            emptyIcon="🏥"
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
          module="convenios"
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Modal de cadastro/edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Convênio' : 'Novo Convênio'}</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">🏥</span>
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">Nome</span>
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  disabled={formLoading}
                  autoFocus
                  minLength={2}
                  className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100"
                  placeholder="Ex: Unimed, Amil, Bradesco Saúde"
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
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
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
        title="Confirmar Exclusão de Convênio"
        entityName={excluindo?.nome || ''}
        entityType="convênio"
        isLoading={deleteLoading}
        loadingText="Excluindo convênio..."
        confirmText="Excluir Convênio"
      />
    </PageContainer>
  );
}; 