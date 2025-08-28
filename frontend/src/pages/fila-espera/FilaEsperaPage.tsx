import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppToast } from '@/services/toast';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
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
import { useViewMode } from '@/hooks/useViewMode';
import { useResponsiveTable } from '@/hooks/useResponsiveTable';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useMenuPermissions } from '@/hooks/useMenuPermissions';
import type { FilaEspera, HorarioPreferencia } from '@/types/FilaEspera';
import { 
  getFilaEspera,
  createFilaEspera,
  updateFilaEspera,
  deleteFilaEspera,
  toggleFilaEsperaStatus
} from '@/services/fila-espera';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import ConfirmacaoModal from '@/components/ConfirmacaoModal';

const HORA_LABEL: Record<HorarioPreferencia, string> = {
  'MANHÃ': 'Manhã',
  'TARDE': 'Tarde',
  'NOITE': 'Noite',
};

export default function FilaEsperaPage() {
  const [items, setItems] = useState<FilaEspera[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [canToggle, setCanToggle] = useState(true);

  const [showCriarModal, setShowCriarModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [editando, setEditando] = useState<FilaEspera | null>(null);

  const [form, setForm] = useState({
    pacienteId: '',
    servicoId: '',
    profissionalId: '',
    horarioPreferencia: 'MANHÃ' as HorarioPreferencia,
    observacao: '',
    status: 'pendente',
    ativo: true,
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [excluindo, setExcluindo] = useState<FilaEspera | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'fila-espera-view' });
  const table = useResponsiveTable({ pageSize: 10 });
  // Estado para mostrar/ocultar painel de filtros
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const { hasPermission } = useMenuPermissions();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const info = await getRouteInfo('/fila-de-espera', 'GET');
        if (mounted) setRouteInfo(info);
        setCanCreate(hasPermission('fila-de-espera') && !!(await getRouteInfo('/fila-de-espera', 'POST')));
        setCanUpdate(hasPermission('fila-de-espera') && !!(await getRouteInfo('/fila-de-espera/:id', 'PUT')));
        setCanDelete(hasPermission('fila-de-espera') && !!(await getRouteInfo('/fila-de-espera/:id', 'DELETE')));
        setCanToggle(hasPermission('fila-de-espera') && !!(await getRouteInfo('/fila-de-espera/:id/status', 'PATCH')));
        const data = await getFilaEspera();
        if (mounted) setItems(data);
      } catch (err: any) {
        if (err?.response?.status === 403) {
          setAccessDenied(true);
        } else {
          AppToast.error('Erro ao carregar fila de espera');
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  

  const columns: TableColumn<FilaEspera>[] = [
    { 
      key: 'horarioPreferencia', 
      header: 'Horário', 
      essential: true,
      filterable: { 
        type: 'select', 
        placeholder: 'Selecione o horário...',
        options: [
          { label: 'Manhã', value: 'MANHÃ' },
          { label: 'Tarde', value: 'TARDE' },
          { label: 'Noite', value: 'NOITE' },
        ]
      },
      render: (row) => HORA_LABEL[row.horarioPreferencia]
    },
    { 
      key: 'status', 
      header: 'Status', 
      essential: true,
      filterable: { type: 'text', placeholder: 'Buscar status...' },
      render: (row) => <Badge variant="outline">{row.status || 'pendente'}</Badge> 
    },
    { 
      key: 'ativo', 
      header: 'Ativo', 
      filterable: { 
        type: 'select', 
        placeholder: 'Filtrar ativo...',
        options: [
          { label: 'Ativo', value: 'true' },
          { label: 'Inativo', value: 'false' }
        ]
      },
      render: (row) => row.ativo ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge> 
    },
  ];

  // Hook de filtros dinâmicos baseado nas colunas
  const {
    activeFilters,
    filterConfigs,
    activeFiltersCount,
    setFilter,
    clearAllFilters,
    applyFilters
  } = useTableFilters(columns);

  const filtered = useMemo(() => applyFilters(items).filter((i) => {
    if (!busca) return true;
    const text = [i.status, i.observacao, i.horarioPreferencia].join(' ').toLowerCase();
    return text.includes(busca.toLowerCase());
  }), [items, busca, activeFilters, applyFilters]);

  const handleCreate = async () => {
    try {
      setFormLoading(true);
      const payload = { ...form, profissionalId: form.profissionalId || null } as any;
      const created = await createFilaEspera(payload);
      setItems((prev) => [created, ...prev]);
      setShowCriarModal(false);
      AppToast.success('Adicionado à fila de espera');
    } catch (e: any) {
      AppToast.error(e?.response?.data?.message || 'Erro ao criar item');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editando) return;
    try {
      setFormLoading(true);
      const payload = { ...form, profissionalId: form.profissionalId || null } as any;
      const updated = await updateFilaEspera(editando.id, payload);
      setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setShowEditarModal(false);
      setEditando(null);
      AppToast.success('Item atualizado');
    } catch (e: any) {
      AppToast.error(e?.response?.data?.message || 'Erro ao atualizar item');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    try {
      setDeleteLoading(true);
      await deleteFilaEspera(excluindo.id);
      setItems((prev) => prev.filter((p) => p.id !== excluindo.id));
      setExcluindo(null);
      AppToast.success('Item removido');
    } catch (e: any) {
      AppToast.error(e?.response?.data?.message || 'Erro ao remover item');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggle = async (row: FilaEspera) => {
    try {
      const updated = await toggleFilaEsperaStatus(row.id, !row.ativo);
      setItems((prev) => prev.map((p) => (p.id === row.id ? updated : p)));
    } catch (e: any) {
      AppToast.error(e?.response?.data?.message || 'Erro ao alterar status');
    }
  };

  const resetForm = () => {
    setForm({
      pacienteId: '',
      servicoId: '',
      profissionalId: '',
      horarioPreferencia: 'MANHÃ',
      observacao: '',
      status: 'pendente',
      ativo: true,
    });
    setFormError('');
  };

  const openEdit = (row: FilaEspera) => {
    setEditando(row);
    setForm({
      pacienteId: row.pacienteId,
      servicoId: row.servicoId,
      profissionalId: row.profissionalId || '',
      horarioPreferencia: row.horarioPreferencia,
      observacao: row.observacao || '',
      status: row.status || 'pendente',
      ativo: !!row.ativo,
    });
    setShowEditarModal(true);
  };

  const renderForm = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="input" placeholder="Paciente ID" value={form.pacienteId} onChange={(e) => setForm((f) => ({ ...f, pacienteId: e.target.value }))} />
        <input className="input" placeholder="Serviço ID" value={form.servicoId} onChange={(e) => setForm((f) => ({ ...f, servicoId: e.target.value }))} />
        <input className="input" placeholder="Profissional ID (opcional)" value={form.profissionalId} onChange={(e) => setForm((f) => ({ ...f, profissionalId: e.target.value }))} />
        <select className="input" value={form.horarioPreferencia} onChange={(e) => setForm((f) => ({ ...f, horarioPreferencia: e.target.value as HorarioPreferencia }))}>
          <option value="MANHÃ">Manhã</option>
          <option value="TARDE">Tarde</option>
          <option value="NOITE">Noite</option>
        </select>
        <input className="input" placeholder="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
        <textarea className="input" placeholder="Observação" value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} />
      </div>
      {formError ? <div className="text-red-500 text-sm">{formError}</div> : null}
      <div className="flex gap-2">
        {editando ? (
          <Button onClick={handleUpdate} disabled={formLoading}>Salvar</Button>
        ) : (
          <Button onClick={handleCreate} disabled={formLoading}>Criar</Button>
        )}
        <Button variant="secondary" onClick={resetForm} disabled={formLoading}><RotateCcw className="w-4 h-4 mr-1"/>Limpar</Button>
      </div>
    </div>
  );

  return (
    <PageContainer>
      <PageHeader 
        title="Fila de Espera" 
        description={routeInfo?.descricao || 'Gerencie a fila de espera de atendimentos.'}
        actions={
          <div className="flex gap-2">
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} module="pacientes" />
            {canCreate && <Button onClick={() => { resetForm(); setShowCriarModal(true); }}><Plus className="w-4 h-4 mr-1"/>Novo</Button>}
          </div>
        }
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Itens</CardTitle>
            <CardDescription>Controle dos itens da fila</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              <SearchBar value={busca} onChange={setBusca} placeholder="Buscar por status, observação..." />
              <FilterButton 
                showFilters={mostrarFiltros}
                onToggleFilters={() => setMostrarFiltros(prev => !prev)}
                activeFiltersCount={activeFiltersCount}
                module="pacientes"
                disabled={filterConfigs.length === 0}
              />
            </div>

            <DynamicFilterPanel
              isVisible={mostrarFiltros}
              filterConfigs={filterConfigs}
              activeFilters={activeFilters}
              onFilterChange={setFilter}
              onClearAll={clearAllFilters}
              onClose={() => setMostrarFiltros(false)}
              module="pacientes"
            />

            {viewMode === 'table' ? (
              <ResponsiveTable 
                data={filtered}
                columns={columns}
                module="pacientes"
                actions={(row) => (
                  <div className="flex gap-2">
                    {canUpdate && <ActionButton icon={Edit} onClick={() => openEdit(row)} title="Editar" />}
                    {canToggle && <ActionButton icon={RotateCcw} onClick={() => handleToggle(row)} title="Ativar/Inativar" />}
                    {canDelete && <ActionButton icon={Trash2} onClick={() => setExcluindo(row)} title="Excluir" />}
                  </div>
                )}
                pagination={table.pagination}
              />
            ) : (
              <ResponsiveCards 
                data={filtered}
                renderCard={(row) => (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">{HORA_LABEL[row.horarioPreferencia]}</Badge>
                      <div className="flex gap-1">
                        {canUpdate && <ActionButton icon={Edit} onClick={() => openEdit(row)} title="Editar" />}
                        {canToggle && <ActionButton icon={RotateCcw} onClick={() => handleToggle(row)} title="Ativar/Inativar" />}
                        {canDelete && <ActionButton icon={Trash2} onClick={() => setExcluindo(row)} title="Excluir" />}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">{row.status || 'pendente'}</div>
                    {row.observacao && <div className="text-sm text-gray-500">{row.observacao}</div>}
                    <ResponsiveCardFooter active={!!row.ativo} />
                  </div>
                )}
                pagination={table.pagination}
              />
            )}
          </CardContent>
        </Card>
      </PageContent>

      {/* Modal Criar */}
      {showCriarModal && (
        <ConfirmacaoModal 
          title="Adicionar à Fila"
          description={renderForm() as any}
          onClose={() => setShowCriarModal(false)}
        />
      )}

      {/* Modal Editar */}
      {showEditarModal && (
        <ConfirmacaoModal 
          title="Editar Item"
          description={renderForm() as any}
          onClose={() => setShowEditarModal(false)}
        />
      )}

      {/* Modal Excluir */}
      {excluindo && (
        <ConfirmDeleteModal 
          isOpen={!!excluindo}
          title="Excluir item"
          description="Tem certeza que deseja excluir este item?"
          onClose={() => setExcluindo(null)}
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      )}
    </PageContainer>
  );
}


