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
import { useAuth } from '@/features/auth/context/auth-context';
import {
  getAgendamentos,
  liberarAgendamento,
} from '@/features/agendamentos/services/agendamentos-api';
import type { Agendamento } from '@/features/agendamentos/types';
import { useToast } from '@/providers/toast-provider';

function parseApiError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (message) return message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const data = date.toLocaleDateString('pt-BR');
  const hora = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data} às ${hora}`;
}

function getTodayIso() {
  return new Date().toISOString().split('T')[0];
}

function isParticular(item: Agendamento) {
  return !item.convenioId || !item.convenioNome || item.convenioNome.toLowerCase().includes('particular');
}

export function ReleaseAppointmentsScreen() {
  const { permissions } = useAuth();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [queryDebounced, setQueryDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Agendamento[]>([]);
  const [selected, setSelected] = useState<Agendamento | null>(null);
  const [saving, setSaving] = useState(false);

  const [codLiberacao, setCodLiberacao] = useState('');
  const [statusCodLiberacao, setStatusCodLiberacao] = useState('AUTORIZADO');
  const [dataLiberacao, setDataLiberacao] = useState(getTodayIso());
  const canLiberarConvenio = useMemo(
    () => permissions.some((item) => item.path === '/agendamentos-liberar/:id' && item.method.toUpperCase() === 'PUT'),
    [permissions],
  );

  useEffect(() => {
    const timer = setTimeout(() => setQueryDebounced(query.trim().toLowerCase()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const [agendados, solicitados] = await Promise.all([
        getAgendamentos({ page: 1, limit: 100, status: 'AGENDADO', orderBy: 'dataHoraInicio', orderDirection: 'asc' }),
        getAgendamentos({ page: 1, limit: 100, status: 'SOLICITADO', orderBy: 'dataHoraInicio', orderDirection: 'asc' }),
      ]);

      const all = [...agendados.data, ...solicitados.data].sort((a, b) => {
        const da = new Date(a.dataHoraInicio).getTime();
        const db = new Date(b.dataHoraInicio).getTime();
        return da - db;
      });

      setItems(all.filter((item) => !isParticular(item)));
    } catch (err) {
      setError(parseApiError(err, 'Não foi possível carregar os agendamentos para liberação.'));
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    if (!queryDebounced) return items;

    return items.filter((item) => {
      const searchable = [
        item.pacienteNome,
        item.servicoNome,
        item.profissionalNome,
        item.convenioNome,
        item.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(queryDebounced);
    });
  }, [items, queryDebounced]);

  const openReleaseModal = useCallback((item: Agendamento) => {
    setSelected(item);
    setDataLiberacao(getTodayIso());
    setCodLiberacao('');
    setStatusCodLiberacao('AUTORIZADO');
  }, []);

  const handleLiberar = useCallback(async () => {
    if (!selected) return;

    if (!canLiberarConvenio) {
      showToast({ message: 'Você não tem permissão para liberar atendimento de convênio.' });
      return;
    }

    if (!dataLiberacao) {
      showToast({ message: 'Informe a data de liberação.' });
      return;
    }

    if (!codLiberacao.trim()) {
      showToast({ message: 'Informe o código de liberação.' });
      return;
    }

    if (!statusCodLiberacao.trim()) {
      showToast({ message: 'Informe o status do código de liberação.' });
      return;
    }

    setSaving(true);
    try {
      await liberarAgendamento(selected.id, {
        codLiberacao: codLiberacao.trim(),
        statusCodLiberacao: statusCodLiberacao.trim(),
        dataCodLiberacao: dataLiberacao,
      });

      showToast({ message: 'Agendamento liberado com sucesso.' });
      setSelected(null);
      await loadData(true);
    } catch (err) {
      showToast({ message: parseApiError(err, 'Não foi possível liberar o agendamento.') });
    } finally {
      setSaving(false);
    }
  }, [canLiberarConvenio, codLiberacao, dataLiberacao, loadData, selected, showToast, statusCodLiberacao]);

  return (
    <AppScreen contentClassName="pt-1 pb-2" edges={['left', 'right', 'bottom']}>

      <View className="mb-3 gap-3">
        <SearchBar placeholder="Buscar paciente, serviço ou convênio..." value={query} onChangeText={setQuery} />
        <Button variant="secondary" size="sm" label={refreshing ? 'Atualizando...' : 'Atualizar lista'} onPress={() => void loadData(true)} />
      </View>

      {loading ? (
        <SkeletonBlock lines={8} />
      ) : error ? (
        <ErrorState description={error} onRetry={() => void loadData()} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="Nenhum agendamento para liberar"
          description="Não há agendamentos com status agendado ou solicitado no momento."
          ctaLabel="Atualizar"
          onPressCta={() => void loadData(true)}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
          {filteredItems.map((item) => {
            return (
              <View key={item.id} className="rounded-2xl border border-surface-border bg-surface-card p-4">
                <View className="mb-2 flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <AppText className="text-base font-semibold text-content-primary">{item.pacienteNome || 'Paciente não informado'}</AppText>
                    <AppText className="mt-1 text-sm text-content-secondary">{item.servicoNome || 'Serviço não informado'}</AppText>
                  </View>
                  <Chip label={item.status} tone={item.status === 'SOLICITADO' ? 'warning' : 'info'} />
                </View>

                <AppText className="text-sm text-content-secondary">{formatDateTime(item.dataHoraInicio)}</AppText>
                <AppText className="mt-1 text-sm text-content-secondary">Profissional: {item.profissionalNome || 'Não informado'}</AppText>
                <AppText className="mt-1 text-sm text-content-secondary">Convênio: {item.convenioNome || 'Particular'}</AppText>

                <Button
                  className="mt-4"
                  variant={canLiberarConvenio ? 'primary' : 'secondary'}
                  label="Liberar convênio"
                  disabled={!canLiberarConvenio}
                  onPress={() => openReleaseModal(item)}
                />
              </View>
            );
          })}
        </ScrollView>
      )}

      <BottomSheet
        visible={Boolean(selected)}
        title="Liberar agendamento"
        onClose={() => setSelected(null)}
        footer={
          <View className="flex-row gap-3">
            <Button label="Cancelar" variant="secondary" className="flex-1" onPress={() => setSelected(null)} />
            <Button label="Confirmar liberação" className="flex-1" onPress={() => void handleLiberar()} loading={saving} />
          </View>
        }
      >
        {selected ? (
          <View className="pb-4">
            <AppText className="text-sm text-content-secondary">Paciente: {selected.pacienteNome || 'Não informado'}</AppText>
            <AppText className="mb-3 mt-1 text-sm text-content-secondary">Tipo: Convênio</AppText>

            <Input
              label="Código de liberação *"
              value={codLiberacao}
              onChangeText={setCodLiberacao}
              placeholder="Digite o código"
            />
            <View className="mt-3">
              <Input
                label="Status do código *"
                value={statusCodLiberacao}
                onChangeText={setStatusCodLiberacao}
                placeholder="Ex.: AUTORIZADO"
              />
            </View>

            <Input
              label="Data de liberação *"
              value={dataLiberacao}
              onChangeText={setDataLiberacao}
              placeholder="AAAA-MM-DD"
            />
          </View>
        ) : null}
      </BottomSheet>
    </AppScreen>
  );
}
