import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBlock } from '@/components/feedback/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { BackToTopButton } from '@/components/ui/back-to-top-button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { SearchBar } from '@/components/ui/search-bar';
import { getAgendamentos, liberarAgendamentoParticular } from '@/features/agendamentos/services/agendamentos-api';
import type { Agendamento } from '@/features/agendamentos/types';
import { useAuth } from '@/features/auth/context/auth-context';
import { useToast } from '@/providers/toast-provider';

const CONVENIO_PARTICULAR_ID = 'f4af6586-8b56-4cf3-8b87-d18605cea381';

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

function getDataFimParticular() {
  const hoje = new Date();
  const mesFinal = (hoje.getMonth() + 3) % 12;
  const anoFinal = hoje.getFullYear() + Math.floor((hoje.getMonth() + 3) / 12);
  const mes = String(mesFinal + 1).padStart(2, '0');
  return `${anoFinal}-${mes}`;
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Agendamento[]>([]);
  const [selected, setSelected] = useState<Agendamento | null>(null);
  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const listRef = useRef<FlatList<Agendamento> | null>(null);

  const [dataLiberacao, setDataLiberacao] = useState(getTodayIso());
  const [recebimento, setRecebimento] = useState(false);

  const canLiberarParticular = useMemo(
    () => permissions.some((item) => item.path === '/agendamentos-liberar-particular/:id' && item.method.toUpperCase() === 'PUT'),
    [permissions],
  );

  useEffect(() => {
    const timer = setTimeout(() => setQueryDebounced(query.trim().toLowerCase()), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchPage = useCallback(
    async (pageToLoad: number, mode: 'replace' | 'append', isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageToLoad > 1 && mode === 'append') {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      if (pageToLoad === 1 || isRefresh) {
        setError(null);
      }

      try {
        const dataFim = getDataFimParticular();

        const [agendados, solicitados] = await Promise.all([
          getAgendamentos({
            page: pageToLoad,
            limit,
            status: 'AGENDADO',
            convenioId: CONVENIO_PARTICULAR_ID,
            dataFim,
            orderBy: 'dataHoraInicio',
            orderDirection: 'asc',
            search: queryDebounced || undefined,
          }),
          getAgendamentos({
            page: pageToLoad,
            limit,
            status: 'SOLICITADO',
            convenioId: CONVENIO_PARTICULAR_ID,
            dataFim,
            orderBy: 'dataHoraInicio',
            orderDirection: 'asc',
            search: queryDebounced || undefined,
          }),
        ]);

        const pageItems = [...agendados.data, ...solicitados.data]
          .filter((item) => isParticular(item))
          .sort((a, b) => {
            const da = new Date(a.dataHoraInicio).getTime();
            const db = new Date(b.dataHoraInicio).getTime();
            return da - db;
          });

        setItems((current) => {
          if (mode === 'replace' || pageToLoad === 1) {
            return pageItems;
          }

          const merged = [...current];
          const existingIds = new Set(current.map((item) => item.id));
          for (const item of pageItems) {
            if (!existingIds.has(item.id)) {
              merged.push(item);
            }
          }
          return merged;
        });

        setPage(pageToLoad);
        setTotal((agendados.pagination?.total || 0) + (solicitados.pagination?.total || 0));
        setTotalPages(Math.max(agendados.pagination?.totalPages || 1, solicitados.pagination?.totalPages || 1));
      } catch (err) {
        if (pageToLoad === 1 || isRefresh) {
          setError(parseApiError(err, 'Não foi possível carregar os agendamentos particulares para liberação.'));
        } else {
          showToast({ message: parseApiError(err, 'Não foi possível carregar mais agendamentos.') });
        }
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else if (pageToLoad > 1 && mode === 'append') {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [limit, queryDebounced, showToast],
  );

  useEffect(() => {
    void fetchPage(1, 'replace');
  }, [fetchPage]);

  const handleEndReached = useCallback(() => {
    if (loading || refreshing || loadingMore) return;
    if (page >= totalPages) return;
    void fetchPage(page + 1, 'append');
  }, [fetchPage, loading, loadingMore, page, refreshing, totalPages]);

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
      await fetchPage(1, 'replace', true);
    } catch (err) {
      showToast({ message: parseApiError(err, 'Não foi possível liberar o agendamento particular.') });
    } finally {
      setSaving(false);
    }
  }, [canLiberarParticular, dataLiberacao, fetchPage, recebimento, selected, showToast]);

  const header = (
    <View className="mb-3 gap-3">
      <PageHeader title="Liberação particulares" subtitle="Libere agendamentos de particulares" />
      <SearchBar placeholder="Buscar paciente ou serviço..." value={query} onChangeText={setQuery} />
      <AppText className="text-xs font-semibold text-content-muted">Exibindo {items.length} de {total} agendamentos</AppText>
      <Button variant="secondary" size="sm" label={refreshing ? 'Atualizando...' : 'Atualizar lista'} onPress={() => void fetchPage(1, 'replace', true)} />
    </View>
  );

  if (loading) {
    return (
      <AppScreen>
        {header}
        <SkeletonBlock lines={8} />
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen>
        {header}
        <ErrorState description={error} onRetry={() => void fetchPage(1, 'replace')} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum agendamento particular para liberar"
            description="Não há agendamentos particulares com status agendado ou solicitado no momento."
            ctaLabel="Atualizar"
            onPressCta={() => void fetchPage(1, 'replace', true)}
          />
        }
        ListFooterComponent={
          <View className="mb-6 mt-2 items-center">
            {loadingMore ? (
              <ActivityIndicator />
            ) : page < totalPages ? (
              <AppText className="text-xs text-content-muted">Role para carregar mais...</AppText>
            ) : (
              <View className="h-2" />
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
        onRefresh={() => void fetchPage(1, 'replace', true)}
        refreshing={refreshing}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.35}
        onScroll={(event) => setShowBackToTop(event.nativeEvent.contentOffset.y > 280)}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
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
        )}
      />
      <BackToTopButton visible={showBackToTop} onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} />

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

            <Input label="Data de liberação *" value={dataLiberacao} onChangeText={setDataLiberacao} placeholder="AAAA-MM-DD" />
          </View>
        ) : null}
      </BottomSheet>
    </AppScreen>
  );
}

