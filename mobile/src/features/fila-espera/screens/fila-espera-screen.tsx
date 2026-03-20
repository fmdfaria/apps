import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBlock } from '@/components/feedback/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { SearchBar } from '@/components/ui/search-bar';
import { Select } from '@/components/ui/select';
import { showConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import {
  createFilaEspera,
  deleteFilaEspera,
  getFilaEspera,
  getFilaEsperaFormOptions,
  updateFilaEspera,
} from '@/features/fila-espera/services/fila-espera-api';
import type { FilaEsperaItem, FilaEsperaOption, HorarioPreferencia } from '@/features/fila-espera/types';
import { useToast } from '@/providers/toast-provider';

type EditForm = {
  pacienteId: string;
  servicoId: string;
  profissionalId: string;
  horarioPreferencia: HorarioPreferencia;
  observacao: string;
};

type HorarioFilter = 'TODOS' | 'MANHA' | 'TARDE' | 'NOITE';

const MORNING_VALUE = 'MANHÃƒ';

const horarioOptions: Array<{ label: string; value: HorarioPreferencia }> = [
  { label: 'Manhã', value: MORNING_VALUE },
  { label: 'Tarde', value: 'TARDE' },
  { label: 'Noite', value: 'NOITE' },
];

function parseApiError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (message) return message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function normalizeHorarioFilter(value?: string | null): Exclude<HorarioFilter, 'TODOS'> {
  const normalized = (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (normalized.startsWith('MANH')) return 'MANHA';
  if (normalized.startsWith('TARDE')) return 'TARDE';
  return 'NOITE';
}

function normalizeHorario(value?: string | null): HorarioPreferencia {
  const filterValue = normalizeHorarioFilter(value);
  if (filterValue === 'MANHA') return MORNING_VALUE;
  if (filterValue === 'TARDE') return 'TARDE';
  return 'NOITE';
}

function getHorarioLabel(horario: HorarioPreferencia) {
  const filterValue = normalizeHorarioFilter(horario);
  if (filterValue === 'MANHA') return 'Manhã';
  if (filterValue === 'TARDE') return 'Tarde';
  return 'Noite';
}

function getHorarioTone(horario: HorarioPreferencia): 'info' | 'warning' | 'neutral' {
  const filterValue = normalizeHorarioFilter(horario);
  if (filterValue === 'MANHA') return 'info';
  if (filterValue === 'TARDE') return 'warning';
  return 'neutral';
}

function mapItemToForm(item: FilaEsperaItem): EditForm {
  return {
    pacienteId: item.pacienteId || '',
    servicoId: item.servicoId || '',
    profissionalId: item.profissionalId || '',
    horarioPreferencia: normalizeHorario(item.horarioPreferencia),
    observacao: item.observacao || '',
  };
}

export function FilaEsperaScreen() {
  const { permissions } = useAuth();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [queryDebounced, setQueryDebounced] = useState('');
  const [horarioFilter, setHorarioFilter] = useState<HorarioFilter>('TODOS');
  const [items, setItems] = useState<FilaEsperaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [editVisible, setEditVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<FilaEsperaItem | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingEditOptions, setLoadingEditOptions] = useState(false);
  const [pacientesOptions, setPacientesOptions] = useState<FilaEsperaOption[]>([]);
  const [servicosOptions, setServicosOptions] = useState<FilaEsperaOption[]>([]);
  const [profissionaisOptions, setProfissionaisOptions] = useState<FilaEsperaOption[]>([]);

  const canView = useMemo(() => hasRoutePermission(permissions, { path: '/fila-de-espera', method: 'GET' }), [permissions]);
  const canCreate = useMemo(() => hasRoutePermission(permissions, { path: '/fila-de-espera', method: 'POST' }), [permissions]);
  const canDelete = useMemo(() => hasRoutePermission(permissions, { path: '/fila-de-espera/:id', method: 'DELETE' }), [permissions]);
  const canUpdate = useMemo(() => hasRoutePermission(permissions, { path: '/fila-de-espera/:id', method: 'PUT' }), [permissions]);

  useEffect(() => {
    const timer = setTimeout(() => setQueryDebounced(query.trim().toLowerCase()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!canView) {
        setError('Você não tem permissão para visualizar a fila de espera.');
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const response = await getFilaEspera();
        setItems(Array.isArray(response) ? response : []);
      } catch (err) {
        setError(parseApiError(err, 'Não foi possível carregar a fila de espera.'));
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [canView],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const itemHorarioFilter = normalizeHorarioFilter(item.horarioPreferencia);

      if (horarioFilter !== 'TODOS' && itemHorarioFilter !== horarioFilter) {
        return false;
      }

      if (!queryDebounced) {
        return true;
      }

      const searchable = [item.pacienteNome, item.servicoNome, item.profissionalNome, item.observacao, item.pacienteId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(queryDebounced);
    });
  }, [horarioFilter, items, queryDebounced]);

  const loadEditOptions = useCallback(async () => {
    if (pacientesOptions.length > 0 && servicosOptions.length > 0) {
      return;
    }

    setLoadingEditOptions(true);
    try {
      const options = await getFilaEsperaFormOptions();
      setPacientesOptions(options.pacientes);
      setServicosOptions(options.servicos);
      setProfissionaisOptions(options.profissionais);
    } catch (err) {
      showToast({ message: parseApiError(err, 'Não foi possível carregar os dados para edição.') });
    } finally {
      setLoadingEditOptions(false);
    }
  }, [pacientesOptions.length, profissionaisOptions.length, servicosOptions.length, showToast]);

  const handleOpenCreate = useCallback(async () => {
    if (!canCreate) return;

    setIsCreateMode(true);
    setEditingItem(null);
    setEditForm({
      pacienteId: '',
      servicoId: '',
      profissionalId: '',
      horarioPreferencia: MORNING_VALUE,
      observacao: '',
    });
    setEditVisible(true);
    await loadEditOptions();
  }, [canCreate, loadEditOptions]);

  const handleOpenEdit = useCallback(
    async (item: FilaEsperaItem) => {
      if (!canUpdate) return;

      setIsCreateMode(false);
      setEditingItem(item);
      setEditForm(mapItemToForm(item));
      setEditVisible(true);
      await loadEditOptions();
    },
    [canUpdate, loadEditOptions],
  );

  const closeForm = useCallback(() => {
    setEditVisible(false);
    setEditingItem(null);
    setIsCreateMode(false);
    setEditForm(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editForm) return;

    if (!editForm.pacienteId) {
      showToast({ message: 'Selecione um paciente.' });
      return;
    }

    if (!editForm.servicoId) {
      showToast({ message: 'Selecione um serviço.' });
      return;
    }

    if (!editForm.horarioPreferencia) {
      showToast({ message: 'Selecione o horário de preferência.' });
      return;
    }

    setSavingEdit(true);
    try {
      if (isCreateMode) {
        await createFilaEspera({
          pacienteId: editForm.pacienteId,
          servicoId: editForm.servicoId,
          profissionalId: editForm.profissionalId ? editForm.profissionalId : null,
          horarioPreferencia: editForm.horarioPreferencia,
          observacao: editForm.observacao || null,
        });
        showToast({ message: 'Item adicionado à fila com sucesso.' });
      } else {
        if (!editingItem) return;
        await updateFilaEspera(editingItem.id, {
          pacienteId: editForm.pacienteId,
          servicoId: editForm.servicoId,
          profissionalId: editForm.profissionalId ? editForm.profissionalId : null,
          horarioPreferencia: editForm.horarioPreferencia,
          observacao: editForm.observacao || null,
          ativo: editingItem.ativo ?? true,
        });
        showToast({ message: 'Item da fila atualizado com sucesso.' });
      }

      closeForm();
      await loadData(true);
    } catch (err) {
      showToast({ message: parseApiError(err, isCreateMode ? 'Não foi possível adicionar o item.' : 'Não foi possível atualizar o item.') });
    } finally {
      setSavingEdit(false);
    }
  }, [closeForm, editForm, editingItem, isCreateMode, loadData, showToast]);

  const handleDelete = useCallback(
    async (item: FilaEsperaItem) => {
      if (!canDelete) return;

      const confirmed = await showConfirmDialog({
        title: 'Excluir item',
        message: `Deseja realmente excluir ${item.pacienteNome || 'este item'} da fila de espera?`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        destructive: true,
      });

      if (!confirmed) return;

      setActionLoadingId(item.id);
      try {
        await deleteFilaEspera(item.id);
        showToast({ message: 'Item excluído com sucesso.' });
        await loadData(true);
      } catch (err) {
        showToast({ message: parseApiError(err, 'Não foi possível excluir o item.') });
      } finally {
        setActionLoadingId(null);
      }
    },
    [canDelete, loadData, showToast],
  );

  const pacienteSelectOptions = useMemo(() => pacientesOptions.map((item) => ({ label: item.nome, value: item.id })), [pacientesOptions]);
  const servicoSelectOptions = useMemo(() => servicosOptions.map((item) => ({ label: item.nome, value: item.id })), [servicosOptions]);
  const profissionalSelectOptions = useMemo(
    () => [{ label: 'Sem profissional definido', value: '' }, ...profissionaisOptions.map((item) => ({ label: item.nome, value: item.id }))],
    [profissionaisOptions],
  );

  return (
    <AppScreen contentClassName="pt-1 pb-2">
      <PageHeader title="Fila de Espera" subtitle="Gerencie os pacientes em espera" className="mb-2" />

      <View className="mb-3 gap-3">
        <SearchBar placeholder="Buscar por paciente, serviço ou profissional..." value={query} onChangeText={setQuery} />
        <View className="flex-row gap-2">
          <Chip label="Todos" tone="neutral" selected={horarioFilter === 'TODOS'} onPress={() => setHorarioFilter('TODOS')} />
          <Chip label="Manhã" tone="info" selected={horarioFilter === 'MANHA'} onPress={() => setHorarioFilter('MANHA')} />
          <Chip label="Tarde" tone="warning" selected={horarioFilter === 'TARDE'} onPress={() => setHorarioFilter('TARDE')} />
          <Chip label="Noite" tone="neutral" selected={horarioFilter === 'NOITE'} onPress={() => setHorarioFilter('NOITE')} />
        </View>
        <View className="flex-row gap-2">
          <Button
            variant="secondary"
            size="sm"
            label={refreshing ? 'Atualizando...' : 'Atualizar lista'}
            onPress={() => void loadData(true)}
            className="flex-1"
          />
          {canCreate ? <Button size="sm" label="Adicionar à Fila" onPress={() => void handleOpenCreate()} className="flex-1" /> : null}
        </View>
      </View>

      {loading ? (
        <SkeletonBlock lines={8} />
      ) : error ? (
        <ErrorState description={error} onRetry={() => void loadData()} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="Nenhum item na fila"
          description="Não há registros para os filtros informados."
          ctaLabel="Atualizar"
          onPressCta={() => void loadData(true)}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
          {filteredItems.map((item) => {
            const horario = normalizeHorario(item.horarioPreferencia);
            const loadingItem = actionLoadingId === item.id;

            return (
              <View key={item.id} className="rounded-2xl border border-surface-border bg-surface-card p-4">
                <View className="mb-2 flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <AppText className="text-base font-semibold text-content-primary">{item.pacienteNome || 'Paciente não informado'}</AppText>
                    <AppText className="mt-1 text-sm text-content-secondary">Serviço: {item.servicoNome || 'Não informado'}</AppText>
                    <AppText className="mt-1 text-sm text-content-secondary">Profissional: {item.profissionalNome || 'Não informado'}</AppText>
                  </View>
                  <Chip label={getHorarioLabel(horario)} tone={getHorarioTone(horario)} />
                </View>

                {item.observacao ? <AppText className="mt-1 text-sm text-content-secondary">Observação: {item.observacao}</AppText> : null}

                <View className="mt-4 flex-row gap-2">
                  {canUpdate ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      label="Editar"
                      onPress={() => void handleOpenEdit(item)}
                      loading={loadingItem}
                      className="flex-1"
                    />
                  ) : null}

                  {canDelete ? (
                    <Button
                      size="sm"
                      label="Excluir"
                      onPress={() => void handleDelete(item)}
                      loading={loadingItem}
                      disabled={loadingItem}
                      className="flex-1"
                    />
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <BottomSheet
        visible={editVisible}
        onClose={() => {
          if (savingEdit) return;
          closeForm();
        }}
        title={isCreateMode ? 'Adicionar à fila' : 'Editar item da fila'}
        footer={
          <View className="flex-row gap-2">
            <Button
              label="Cancelar"
              variant="secondary"
              className="flex-1"
              onPress={() => {
                if (savingEdit) return;
                closeForm();
              }}
              disabled={savingEdit}
            />
            <Button label={isCreateMode ? 'Adicionar' : 'Salvar'} className="flex-1" onPress={() => void handleSave()} loading={savingEdit} />
          </View>
        }
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
          <Select
            label="Paciente *"
            placeholder={loadingEditOptions ? 'Carregando pacientes...' : 'Selecione'}
            value={editForm?.pacienteId || ''}
            onChange={(value) => setEditForm((current) => (current ? { ...current, pacienteId: value } : current))}
            options={pacienteSelectOptions}
          />
          <Select
            label="Serviço *"
            placeholder={loadingEditOptions ? 'Carregando serviços...' : 'Selecione'}
            value={editForm?.servicoId || ''}
            onChange={(value) => setEditForm((current) => (current ? { ...current, servicoId: value } : current))}
            options={servicoSelectOptions}
          />
          <Select
            label="Profissional"
            placeholder={loadingEditOptions ? 'Carregando profissionais...' : 'Selecione'}
            value={editForm?.profissionalId || ''}
            onChange={(value) => setEditForm((current) => (current ? { ...current, profissionalId: value } : current))}
            options={profissionalSelectOptions}
          />
          <Select
            label="Horário de preferência *"
            placeholder="Selecione"
            value={editForm?.horarioPreferencia || MORNING_VALUE}
            onChange={(value) => setEditForm((current) => (current ? { ...current, horarioPreferencia: value as HorarioPreferencia } : current))}
            options={horarioOptions}
          />
          <Input
            label="Observação"
            value={editForm?.observacao || ''}
            onChangeText={(value) => setEditForm((current) => (current ? { ...current, observacao: value } : current))}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="py-3"
          />
        </ScrollView>
      </BottomSheet>
    </AppScreen>
  );
}
