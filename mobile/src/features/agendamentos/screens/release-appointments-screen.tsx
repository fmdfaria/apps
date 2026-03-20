import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
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
        const [agendados, solicitados] = await Promise.all([
          getAgendamentos({
            page: pageToLoad,
            limit,
            status: 'AGENDADO',
            orderBy: 'dataHoraInicio',
            orderDirection: 'asc',
            search: queryDebounced || undefined,
          }),
          getAgendamentos({
            page: pageToLoad,
            limit,
            status: 'SOLICITADO',
            orderBy: 'dataHoraInicio',
            orderDirection: 'asc',
            search: queryDebounced || undefined,
          }),
        ]);

        const pageItems = [...agendados.data, ...solicitados.data]
          .filter((item) => !isParticular(item))
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
          setError(parseApiError(err, 'Não foi possível carregar os agendamentos para liberação.'));
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
      await fetchPage(1, 'replace', true);
    } catch (err) {
      showToast({ message: parseApiError(err, 'Não foi possível liberar o agendamento.') });
    } finally {
      setSaving(false);
    }
  }, [canLiberarConvenio, codLiberacao, dataLiberacao, fetchPage, selected, showToast, statusCodLiberacao]);

  const header = (
    <View className="mb-3 gap-3">
      <PageHeader title="Liberação" subtitle="Libere agendamentos de convênio" />
      <SearchBar placeholder="Buscar paciente, serviço ou convênio..." value={query} onChangeText={setQuery} />
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
            title="Nenhum agendamento para liberar"
            description="Não há agendamentos com status agendado ou solicitado no momento."
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
        renderItem={({ item }) => {
          return (
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
        }}
      />
      <BackToTopButton visible={showBackToTop} onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} />

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

