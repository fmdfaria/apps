import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast, toast } from '@/components/ui/use-toast';
import { getBancos, createBanco, updateBanco, deleteBanco } from '@/services/bancos';
import type { Banco } from '@/types/Banco';
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
import { useInputMask } from '@/hooks/useInputMask';

// Definir tipo de formulário separado
interface FormularioBanco {
  codigo: string;
  nome: string;
}

export const BancosPageResponsive = () => {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Banco | null>(null);
  const [form, setForm] = useState<FormularioBanco>({
    codigo: '',
    nome: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<Banco | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Máscara para o campo código (formato: 000 - 3 dígitos)
  const codigoMask = useInputMask('999', 3);

  // Função para lidar com mudança do campo código com máscara
  const handleCodigoChange = (value: string) => {
    const maskedValue = codigoMask(value);
    setForm(prev => ({ ...prev, codigo: maskedValue }));
    
    // Limpa erro de validação quando o usuário começa a digitar
    if (formError && maskedValue.length === 3) {
      setFormError('');
    }
  };

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'bancos-view' });
  
  // Configuração das colunas da tabela com filtros dinâmicos
  const columns: TableColumn<Banco>[] = [
    {
      key: 'codigo',
      header: '🔢 Código',
      essential: true,
      className: 'font-mono',
      filterable: {
        type: 'text',
        placeholder: 'Código do banco...',
        label: 'Código'
      },
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {item.codigo.charAt(0)}
          </div>
          <span className="text-sm font-medium font-mono bg-emerald-100 px-2 py-1 rounded text-emerald-700">
            {item.codigo}
          </span>
        </div>
      )
    },
    {
      key: 'nome',
      header: '🏦 Nome',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome do banco...',
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
            module="bancos"
            onClick={() => abrirModalEditar(item)}
            title="Editar Banco"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant="delete"
            module="bancos"
            onClick={() => confirmarExclusao(item)}
            title="Excluir Banco"
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
  const bancosFiltrados = useMemo(() => {
    // Primeiro aplicar busca textual
    let dadosFiltrados = bancos.filter(b =>
      b.nome.toLowerCase().includes(busca.toLowerCase()) ||
      b.codigo.toLowerCase().includes(busca.toLowerCase())
    );
    
    // Depois aplicar filtros dinâmicos
    return applyFilters(dadosFiltrados);
  }, [bancos, busca, applyFilters]);

  const {
    data: bancosPaginados,
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
  } = useResponsiveTable(bancosFiltrados, 10);

  useEffect(() => {
    fetchBancos();
  }, []);

  const fetchBancos = async () => {
    setLoading(true);
    try {
      const data = await getBancos();
      setBancos(data);
    } catch (e) {
      toast({ title: 'Erro ao carregar bancos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Renderização do card
  const renderCard = (banco: Banco) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">🏦</span>
            <CardTitle className="text-sm font-medium truncate">{banco.nome}</CardTitle>
          </div>
          <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {banco.codigo.charAt(0)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Código:</span>
            <span className="text-xs font-mono bg-emerald-100 px-2 py-1 rounded text-emerald-700">
              {banco.codigo}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 px-3 pb-3">
        <div className="flex items-center gap-2 w-full">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-7 text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-600 hover:text-white"
            onClick={() => abrirModalEditar(banco)}
          >
            <Edit className="w-3 h-3 mr-1" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-7 text-xs border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
            onClick={() => confirmarExclusao(banco)}
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
      codigo: '',
      nome: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (b: Banco) => {
    setEditando(b);
    setForm({
      codigo: b.codigo.padStart(3, '0'), // Garante que tenha 3 dígitos
      nome: b.nome,
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      codigo: '',
      nome: '',
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigoNumerico = form.codigo.replace(/\D/g, '');
    
    if (!codigoNumerico || codigoNumerico.length < 3) {
      setFormError('O código deve ter 3 dígitos.');
      return;
    }
    if (!form.nome.trim() || form.nome.trim().length < 1) {
      setFormError('O nome é obrigatório.');
      return;
    }
    setFormLoading(true);
    try {
      if (editando) {
        await updateBanco(editando.id, { codigo: codigoNumerico, nome: form.nome.trim() });
        toast({ title: 'Banco atualizado com sucesso', variant: 'success' });
      } else {
        await createBanco({ codigo: codigoNumerico, nome: form.nome.trim() });
        toast({ title: 'Banco criado com sucesso', variant: 'success' });
      }
      fecharModal();
      fetchBancos();
    } catch (e: any) {
      let msg = 'Erro ao salvar banco';
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

  const confirmarExclusao = (b: Banco) => {
    setExcluindo(b);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteBanco(excluindo.id);
      toast({ title: 'Banco excluído com sucesso', variant: 'success' });
      setExcluindo(null);
      fetchBancos();
    } catch (e) {
      toast({ title: 'Erro ao excluir banco', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando bancos...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header da página */}
      <PageHeader title="Bancos" module="bancos" icon="🏦">
        <SearchBar
          placeholder="Buscar bancos..."
          value={busca}
          onChange={setBusca}
          module="bancos"
        />
        
        <FilterButton
          showFilters={mostrarFiltros}
          onToggleFilters={() => setMostrarFiltros(prev => !prev)}
          activeFiltersCount={activeFiltersCount}
          module="bancos"
          disabled={filterConfigs.length === 0}
          tooltip={filterConfigs.length === 0 ? 'Nenhum filtro configurado' : undefined}
        />
        
        <ViewToggle 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
          module="bancos"
        />
        
        <Button 
          className="!h-10 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
          onClick={abrirModalNovo}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Banco
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
          module="bancos"
        />

        {/* Conteúdo baseado no modo de visualização */}
        {viewMode === 'table' ? (
          <ResponsiveTable 
            data={bancosPaginados}
            columns={columns}
            module="bancos"
            emptyMessage="Nenhum banco encontrado"
            isLoadingMore={isLoadingMore}
            hasNextPage={hasNextPage}
            isMobile={isMobile}
            scrollRef={targetRef}
          />
        ) : (
          <ResponsiveCards 
            data={bancosPaginados}
            renderCard={renderCard}
            emptyMessage="Nenhum banco encontrado"
            emptyIcon="🏦"
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
          module="bancos"
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Modal de cadastro/edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Banco' : 'Novo Banco'}</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">🔢</span>
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent font-semibold">Código</span>
                  <span className="text-red-500">*</span>
                  {form.codigo.length === 3 && (
                    <span className="text-emerald-600 text-xs">✓</span>
                  )}
                </label>
                <Input
                  type="text"
                  value={form.codigo}
                  onChange={e => handleCodigoChange(e.target.value)}
                  onKeyPress={e => {
                    // Permite apenas números
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  disabled={formLoading}
                  autoFocus
                  className={`hover:border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100 font-mono ${
                    form.codigo.length === 3 ? 'border-emerald-500 bg-emerald-50' : ''
                  }`}
                  placeholder="000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">🏦</span>
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent font-semibold">Nome</span>
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  disabled={formLoading}
                  className="hover:border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100"
                  placeholder="Ex: Banco do Brasil S.A."
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
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
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
        title="Confirmar Exclusão de Banco"
        entityName={excluindo?.nome || ''}
        entityType="banco"
        isLoading={deleteLoading}
        loadingText="Excluindo banco..."
        confirmText="Excluir Banco"
      />
    </PageContainer>
  );
}; 