import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from 'react-native';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBlock } from '@/components/feedback/skeleton';
import { SearchBar } from '@/components/ui/search-bar';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { BackToTopButton } from '@/components/ui/back-to-top-button';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import { getAgendamentos, getMeuProfissional } from '@/features/agendamentos/services/agendamentos-api';
import type { Agendamento, StatusAgendamento } from '@/features/agendamentos/types';
import { routes } from '@/navigation/routes';
import { useRouter } from 'expo-router';
import { useToast } from '@/providers/toast-provider';
import type { StatusTone } from '@/types/status';

type FiltroStatus = 'TODOS' | StatusAgendamento;

type StatusItem = {
  id: FiltroStatus;
  label: string;
  tone: StatusTone;
};

const STATUS_FILTROS: StatusItem[] = [
  { id: 'TODOS', label: 'Todos', tone: 'neutral' },
  { id: 'AGENDADO', label: 'Agendado', tone: 'info' },
  { id: 'SOLICITADO', label: 'Solicitado', tone: 'warning' },
  { id: 'LIBERADO', label: 'Liberado', tone: 'success' },
  { id: 'ATENDIDO', label: 'Atendido', tone: 'warning' },
  { id: 'PENDENTE', label: 'Pendente', tone: 'danger' },
  { id: 'FINALIZADO', label: 'Finalizado', tone: 'success' },
  { id: 'CANCELADO', label: 'Cancelado', tone: 'danger' },
  { id: 'ARQUIVADO', label: 'Arquivado', tone: 'neutral' },
];

function parseApiError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (message) {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function formatarDataHoraIntervalo(inicioISO: string, fimISO?: string) {
  const inicio = new Date(inicioISO);
  const inicioData = inicio.toLocaleDateString('pt-BR');
  const inicioHora = inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (!fimISO) {
    return `${inicioData} às ${inicioHora}`;
  }

  const fim = new Date(fimISO);
  const fimHora = fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${inicioData} • ${inicioHora} - ${fimHora}`;
}

function getStatusInfo(status: StatusAgendamento): { label: string; tone: StatusTone } {
  const info: Record<StatusAgendamento, { label: string; tone: StatusTone }> = {
    AGENDADO: { label: 'Agendado', tone: 'info' },
    SOLICITADO: { label: 'Solicitado', tone: 'warning' },
    LIBERADO: { label: 'Liberado', tone: 'success' },
    ATENDIDO: { label: 'Atendido', tone: 'warning' },
    FINALIZADO: { label: 'Finalizado', tone: 'success' },
    CANCELADO: { label: 'Cancelado', tone: 'danger' },
    ARQUIVADO: { label: 'Arquivado', tone: 'neutral' },
    PENDENTE: { label: 'Pendente', tone: 'danger' },
  };

  return info[status];
}

function calcularDataFimPadrao() {
  const hoje = new Date();
  const dataFim = new Date(hoje);
  dataFim.setDate(dataFim.getDate() + 90);
  return dataFim.toISOString().split('T')[0];
}

export function AgendamentosScreen() {
  const router = useRouter();
  const { user, permissions } = useAuth();
  const { showToast } = useToast();
  const canCreateAgendamento = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos', method: 'POST' }),
    [permissions],
  );

  const [query, setQuery] = useState('');
  const [queryDebounced, setQueryDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState<FiltroStatus>('TODOS');
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Agendamento> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQueryDebounced(query.trim()), 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [queryDebounced, statusFilter]);

  const carregarAgendamentos = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else if (page > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      if (page === 1 || isRefresh) {
        setError(null);
      }

      try {
        const normalizedRoles = (user?.roles || []).map((role) => String(role).toUpperCase());
        const isProfissional = normalizedRoles.some((role) => role === 'PROFISSIONAL' || role.includes('PROFISSIONAL'));

        const filtros: {
          page: number;
          limit: number;
          status?: StatusAgendamento;
          search?: string;
          includeArquivados?: boolean;
          statusNotIn?: string[];
          dataFim?: string;
          profissionalId?: string;
        } = {
          page,
          limit,
        };

        if (statusFilter !== 'TODOS') {
          filtros.status = statusFilter;
        }

        if (queryDebounced) {
          filtros.search = queryDebounced;
          filtros.includeArquivados = true;
        } else if (statusFilter === 'TODOS') {
          filtros.statusNotIn = ['ARQUIVADO', 'CANCELADO'];
          filtros.dataFim = calcularDataFimPadrao();
        }

        if (isProfissional) {
          const profissional = await getMeuProfissional();
          filtros.profissionalId = profissional.id;
        }

        const response = await getAgendamentos(filtros);
        setAgendamentos((current) => {
          if (page === 1 || isRefresh) {
            return response.data;
          }

          const merged = [...current];
          const existingIds = new Set(current.map((item) => item.id));
          for (const item of response.data) {
            if (!existingIds.has(item.id)) {
              merged.push(item);
            }
          }
          return merged;
        });
        setTotal(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
      } catch (err) {
        if (page === 1 || isRefresh) {
          setError(parseApiError(err, 'Não foi possível carregar os agendamentos.'));
        } else {
          showToast({ message: parseApiError(err, 'Não foi possível carregar mais agendamentos.') });
          setPage((prev) => Math.max(1, prev - 1));
        }
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else if (page > 1) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [limit, page, queryDebounced, showToast, statusFilter, user?.roles],
  );

  useEffect(() => {
    void carregarAgendamentos();
  }, [carregarAgendamentos]);

  const contagemPorStatus = useMemo(() => {
    return agendamentos.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
  }, [agendamentos]);

  const handleEndReached = useCallback(() => {
    if (loading || refreshing || loadingMore) return;
    if (page >= totalPages) return;
    setPage((prev) => prev + 1);
  }, [loading, loadingMore, page, refreshing, totalPages]);

  const renderHeader = (
    <View>
      <PageHeader
        title="Agendamentos"
        subtitle="Pesquise por agendamentos"
        rightSlot={
          canCreateAgendamento ? (
            <Button label="Novo Agendamento" size="sm" onPress={() => router.push(routes.agendamentosNew)} />
          ) : undefined
        }
      />

      <SearchBar
        placeholder="Buscar agendamentos..."
        value={query}
        onChangeText={setQuery}
      />

      <View className="mt-4 rounded-2xl border border-surface-border bg-surface-card p-3">
        <AppText className="mb-2 text-xs font-semibold text-content-muted">Status</AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingHorizontal: 1 }}
        >
          {STATUS_FILTROS.map((item) => {
            const totalStatus = item.id === 'TODOS' ? total : (contagemPorStatus[item.id] || 0);
            const label = `${item.label}${totalStatus > 0 ? ` (${totalStatus})` : ''}`;

            return (
              <Chip
                key={item.id}
                label={label}
                tone={item.tone}
                selected={statusFilter === item.id}
                onPress={() => setStatusFilter(item.id)}
              />
            );
          })}
        </ScrollView>
      </View>

      <AppText className="mt-3 text-xs font-semibold text-content-muted">
        Exibindo {agendamentos.length} de {total} agendamentos
      </AppText>
    </View>
  );

  if (loading) {
    return (
      <AppScreen>
        {renderHeader}
        <View className="mt-4 gap-3">
          <SkeletonBlock lines={5} />
          <SkeletonBlock lines={5} />
          <SkeletonBlock lines={5} />
        </View>
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen>
        {renderHeader}
        <View className="mt-4">
          <ErrorState description={error} onRetry={() => void carregarAgendamentos()} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <FlatList
        ref={listRef}
        data={agendamentos}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View className="mt-4">
            <ErrorState
              title="Nenhum agendamento encontrado"
              description="Ajuste os filtros ou altere o texto de busca para encontrar registros."
              onRetry={() => void carregarAgendamentos(true)}
            />
          </View>
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
        contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        onRefresh={() => void carregarAgendamentos(true)}
        refreshing={refreshing}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.35}
        onScroll={(event) => setShowBackToTop(event.nativeEvent.contentOffset.y > 280)}
        scrollEventThrottle={16}
        renderItem={({ item }) => {
          const status = getStatusInfo(item.status);

          return (
            <Pressable
              className="relative rounded-2xl border border-surface-border bg-surface-card p-4"
              onPress={() =>
                router.push(
                  routes.agendamentosAppointmentActions({
                    agendamentoId: item.id,
                    pacienteId: item.pacienteId,
                    profissionalId: item.profissionalId,
                    recursoId: item.recursoId,
                    convenioId: item.convenioId,
                    servicoId: item.servicoId,
                    pacienteNome: item.pacienteNome || '',
                    profissionalNome: item.profissionalNome || '',
                    servicoNome: item.servicoNome || '',
                    convenioNome: item.convenioNome || '',
                    recursoNome: item.recursoNome || '',
                    dataHoraInicio: item.dataHoraInicio,
                    dataHoraFim: item.dataHoraFim,
                    tipoAtendimento: item.tipoAtendimento,
                    status: item.status,
                    recebimento: item.recebimento,
                  }),
                )
              }
            >
              <View className="absolute right-4 top-4 z-10">
                <Chip label={status.label} tone={status.tone} />
              </View>

              <AppText className="mb-3 pr-24 text-base font-semibold text-content-primary">
                {item.pacienteNome || 'Não informado'}
              </AppText>

              <AppText className="text-sm text-content-secondary">
                Data: {formatarDataHoraIntervalo(item.dataHoraInicio, item.dataHoraFim)} | Tipo:{' '}
                {item.tipoAtendimento === 'online' ? 'Online' : 'Presencial'}
              </AppText>
              <AppText className="mt-1 text-sm text-content-secondary">
                Profissional: {item.profissionalNome || 'Não informado'}
              </AppText>
              <AppText className="mt-1 text-sm text-content-secondary">
                Serviço: {item.servicoNome || 'Não informado'} | Recurso: {item.recursoNome || 'Não informado'}
              </AppText>
            </Pressable>
          );
        }}
      />
      <BackToTopButton visible={showBackToTop} onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} />
    </AppScreen>
  );
}



