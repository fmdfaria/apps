import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBlock } from '@/components/feedback/skeleton';
import { SearchBar } from '@/components/ui/search-bar';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import {
  alterarStatusAgendamento,
  getAgendamentos,
  getMeuProfissional,
  setStatusAgendamento,
} from '@/features/agendamentos/services/agendamentos-api';
import type { Agendamento, StatusAgendamento } from '@/features/agendamentos/types';
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

const PROXIMO_STATUS: Partial<Record<StatusAgendamento, StatusAgendamento>> = {
  AGENDADO: 'LIBERADO',
  SOLICITADO: 'AGENDADO',
  LIBERADO: 'ATENDIDO',
  ATENDIDO: 'FINALIZADO',
  PENDENTE: 'AGENDADO',
  CANCELADO: 'AGENDADO',
};

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
  const { user, permissions } = useAuth();
  const { showToast } = useToast();

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
  const [error, setError] = useState<string | null>(null);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  const canCancel = useMemo(() => {
    return hasRoutePermission(permissions, {
      path: '/agendamentos/:id/status',
      method: 'PATCH',
    });
  }, [permissions]);

  const canAlterarStatusLivre = useMemo(() => {
    return hasRoutePermission(permissions, {
      path: '/agendamentos-alterar-status/:id',
      method: 'PUT',
    });
  }, [permissions]);

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
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const normalizedRoles = (user?.roles || []).map((role) => String(role).toUpperCase());
        const isProfissional = normalizedRoles.some((role) => role === 'PROFISSIONAL' || role.includes('PROFISSIONAL'));

        const filtros: {
          page: number;
          limit: number;
          orderBy: string;
          orderDirection: 'asc' | 'desc';
          status?: StatusAgendamento;
          search?: string;
          includeArquivados?: boolean;
          statusNotIn?: string[];
          dataFim?: string;
          profissionalId?: string;
        } = {
          page,
          limit,
          orderBy: 'dataHoraInicio',
          orderDirection: 'asc',
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

        const profissionalIdUsuario = user?.profissionalId || null;
        if (isProfissional || profissionalIdUsuario) {
          const profissionalId = profissionalIdUsuario || (await getMeuProfissional()).id;
          filtros.profissionalId = profissionalId;
        }

        const response = await getAgendamentos(filtros);
        setAgendamentos(response.data);
        setTotal(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
      } catch (err) {
        setError(parseApiError(err, 'Não foi possível carregar os agendamentos.'));
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [limit, page, queryDebounced, statusFilter, user?.profissionalId, user?.roles],
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

  const handleToggleCancelamento = useCallback(
    async (agendamento: Agendamento) => {
      const statusAtual = agendamento.status;
      const novoStatus: StatusAgendamento = statusAtual === 'CANCELADO' ? 'AGENDADO' : 'CANCELADO';

      if (novoStatus === 'CANCELADO' && agendamento.recebimento) {
        showToast({
          message: 'Não é possível cancelar: este agendamento já possui recebimento registrado.',
        });
        return;
      }

      setStatusLoadingId(agendamento.id);
      try {
        await setStatusAgendamento(agendamento.id, novoStatus);
        showToast({
          message:
            novoStatus === 'CANCELADO'
              ? 'Agendamento cancelado com sucesso.'
              : 'Agendamento reativado para agendado.',
        });
        await carregarAgendamentos();
      } catch (err) {
        showToast({ message: parseApiError(err, 'Não foi possível alterar o status do agendamento.') });
      } finally {
        setStatusLoadingId(null);
      }
    },
    [carregarAgendamentos, showToast],
  );

  const handleAvancarStatus = useCallback(
    async (agendamento: Agendamento) => {
      const proximo = PROXIMO_STATUS[agendamento.status];

      if (!proximo) {
        return;
      }

      if (proximo === 'CANCELADO' && agendamento.recebimento) {
        showToast({
          message: 'Não é possível cancelar: este agendamento já possui recebimento registrado.',
        });
        return;
      }

      setStatusLoadingId(agendamento.id);
      try {
        await alterarStatusAgendamento(agendamento.id, proximo);
        showToast({ message: `Status alterado para ${getStatusInfo(proximo).label}.` });
        await carregarAgendamentos();
      } catch (err) {
        showToast({ message: parseApiError(err, 'Não foi possível alterar o status do agendamento.') });
      } finally {
        setStatusLoadingId(null);
      }
    },
    [carregarAgendamentos, showToast],
  );

  const renderHeader = (
    <View>
      <PageHeader title="Agendamentos" subtitle="Pesquise por agendamentos" />

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
          totalPages > 1 ? (
            <View className="mb-6 mt-2 rounded-2xl border border-surface-border bg-surface-card p-3">
              <AppText className="mb-3 text-center text-xs font-semibold text-content-muted">
                Página {page} de {totalPages}
              </AppText>
              <View className="flex-row gap-2">
                <Button
                  label="Anterior"
                  variant="secondary"
                  className="flex-1"
                  disabled={page <= 1}
                  onPress={() => setPage((prev) => Math.max(1, prev - 1))}
                />
                <Button
                  label="Próxima"
                  className="flex-1"
                  disabled={page >= totalPages}
                  onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                />
              </View>
            </View>
          ) : (
            <View className="h-6" />
          )
        }
        contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        onRefresh={() => void carregarAgendamentos(true)}
        refreshing={refreshing}
        renderItem={({ item }) => {
          const status = getStatusInfo(item.status);
          const proximoStatus = PROXIMO_STATUS[item.status];
          const podeCancelar =
            canCancel &&
            (item.status === 'AGENDADO' ||
              item.status === 'SOLICITADO' ||
              item.status === 'LIBERADO' ||
              item.status === 'CANCELADO');

          return (
            <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <View className="mb-3 flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <AppText className="text-base font-semibold text-content-primary">
                    {item.pacienteNome || 'Paciente não informado'}
                  </AppText>
                  <AppText className="mt-1 text-sm text-content-secondary">
                    {item.servicoNome || 'Serviço não informado'}
                  </AppText>
                </View>
                <Chip label={status.label} tone={status.tone} />
              </View>

              <AppText className="text-sm text-content-secondary">
                {formatarDataHoraIntervalo(item.dataHoraInicio, item.dataHoraFim)}
              </AppText>
              <AppText className="mt-1 text-sm text-content-secondary">
                Profissional: {item.profissionalNome || 'Não informado'}
              </AppText>
              <AppText className="mt-1 text-sm text-content-secondary">
                Convênio: {item.convenioNome || 'Não informado'}
              </AppText>
              <AppText className="mt-1 text-sm text-content-secondary">
                Recurso: {item.recursoNome || 'Não informado'}
              </AppText>
              <AppText className="mt-1 text-sm text-content-secondary">
                Tipo: {item.tipoAtendimento === 'online' ? 'Online' : 'Presencial'}
              </AppText>

              <View className="mt-4 gap-2">
                {podeCancelar ? (
                  <Button
                    size="sm"
                    variant={item.status === 'CANCELADO' ? 'secondary' : 'ghost'}
                    label={item.status === 'CANCELADO' ? 'Reativar para agendado' : 'Cancelar agendamento'}
                    loading={statusLoadingId === item.id}
                    onPress={() => void handleToggleCancelamento(item)}
                  />
                ) : null}

                {canAlterarStatusLivre && proximoStatus ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    label={`Avançar para ${getStatusInfo(proximoStatus).label}`}
                    loading={statusLoadingId === item.id}
                    onPress={() => void handleAvancarStatus(item)}
                  />
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </AppScreen>
  );
}
