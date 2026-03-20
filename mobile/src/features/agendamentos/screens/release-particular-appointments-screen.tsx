import { Pressable, ScrollView, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  getAgendamentos,
  liberarAgendamentoParticular,
} from '@/features/agendamentos/services/agendamentos-api';
import type { Agendamento } from '@/features/agendamentos/types';
import { useAuth } from '@/features/auth/context/auth-context';
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

export function ReleaseParticularAppointmentsScreen() {
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

  const [dataLiberacao, setDataLiberacao] = useState(getTodayIso());
  const [recebimento, setRecebimento] = useState(false);

  const canLiberarParticular = useMemo(
    () => permissions.some((item) => item.path === '/agendamentos-liberar-particular/:id' && item.method.toUpperCase() === 'PUT'),
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

      const all = [...agendados.data, ...solicitados.data]
        .filter((item) => isParticular(item))
        .sort((a, b) => {
          const da = new Date(a.dataHoraInicio).getTime();
          const db = new Date(b.dataHoraInicio).getTime();
          return da - db;
        });

      setItems(all);
    } catch (err) {
      setError(parseApiError(err, 'Não foi possível carregar os agendamentos particulares para liberação.'));
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
    setRecebimento(false);
  }, []);

  const handleLiberar = useCallback(async () => {
    if (!selected) return;

    if (!canLiberarParticular) {
      showToast({ message: 'Você não tem permissão para liberar atendimento particular.' });
      return;
    }

    if (!dataLiberacao) {
      showToast({ message: 'Informe a data de liberação.' });
      return;
    }

    setSaving(true);
    try {
      await liberarAgendamentoParticular(selected.id, {
        recebimento,
        dataLiberacao,
        pagamentoAntecipado: false,
      });

      showToast({ message: 'Agendamento particular liberado com sucesso.' });
      setSelected(null);
      await loadData(true);
    } catch (err) {
      showToast({ message: parseApiError(err, 'Não foi possível liberar o agendamento particular.') });
    } finally {
      setSaving(false);
    }
  }, [canLiberarParticular, dataLiberacao, loadData, recebimento, selected, showToast]);

  return (
    <AppScreen contentClassName="pt-1 pb-2" edges={['left', 'right', 'bottom']}>

      <View className="mb-3 gap-3">
        <SearchBar placeholder="Buscar paciente ou serviço..." value={query} onChangeText={setQuery} />
        <Button variant="secondary" size="sm" label={refreshing ? 'Atualizando...' : 'Atualizar lista'} onPress={() => void loadData(true)} />
      </View>

      {loading ? (
        <SkeletonBlock lines={8} />
      ) : error ? (
        <ErrorState description={error} onRetry={() => void loadData()} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="Nenhum agendamento particular para liberar"
          description="Não há agendamentos particulares com status agendado ou solicitado no momento."
          ctaLabel="Atualizar"
          onPressCta={() => void loadData(true)}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
          {filteredItems.map((item) => (
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
              <AppText className="mt-1 text-sm text-content-secondary">Convênio: Particular</AppText>

              <Button
                className="mt-4"
                variant={canLiberarParticular ? 'primary' : 'secondary'}
                label="Liberar particular"
                disabled={!canLiberarParticular}
                onPress={() => openReleaseModal(item)}
              />
            </View>
          ))}
        </ScrollView>
      )}

      <BottomSheet
        visible={Boolean(selected)}
        title="Liberar agendamento particular"
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
            <AppText className="mb-3 mt-1 text-sm text-content-secondary">Tipo: Particular</AppText>

            <View className="mb-3 rounded-xl border border-surface-border bg-surface-background p-3">
              <AppText className="text-sm font-semibold text-content-primary">Recebimento</AppText>
              <View className="mt-2 flex-row gap-2">
                <Pressable
                  onPress={() => setRecebimento(true)}
                  className={`rounded-lg px-3 py-2 ${recebimento ? 'bg-brand-700' : 'bg-slate-200'}`}
                >
                  <AppText className={`text-xs font-semibold ${recebimento ? 'text-white' : 'text-content-primary'}`}>Recebido</AppText>
                </Pressable>
                <Pressable
                  onPress={() => setRecebimento(false)}
                  className={`rounded-lg px-3 py-2 ${!recebimento ? 'bg-brand-700' : 'bg-slate-200'}`}
                >
                  <AppText className={`text-xs font-semibold ${!recebimento ? 'text-white' : 'text-content-primary'}`}>Não recebido</AppText>
                </Pressable>
              </View>
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
