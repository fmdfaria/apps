import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBlock } from '@/components/feedback/skeleton';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import { getAgendamentos, getMeuProfissional, getStatusEvolucoesPorAgendamentos } from '@/features/agendamentos/services/agendamentos-api';
import type { Agendamento, GetAgendamentosParams } from '@/features/agendamentos/types';
import { getFilaEspera } from '@/features/fila-espera/services/fila-espera-api';
import { routes } from '@/navigation/routes';

type DashboardData = {
  liberadosHoje: number;
  evolucoesPendentesLiberados: number;
  finalizadosMes: number;
  solicitadosHoje: number;
  filaEsperaAtiva: number;
  proximosAtendimentos: Agendamento[];
};

type QuickAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bgClassName: string;
  onPress: () => void;
};

function toYmd(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseApiError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (message) return message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getPrimeiroNome(nome?: string | null) {
  if (!nome) return 'Dr(a).';
  const first = nome.trim().split(' ')[0];
  return first || 'Dr(a).';
}

function formatHora(iso?: string | null) {
  if (!iso) return '--:--';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatTempoRestante(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = date.getTime() - Date.now();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin <= 0) return 'agora';
  if (diffMin < 60) return `em - ${diffMin}min`;

  const d = Math.floor(diffMin / (24 * 60));
  const restoMin = diffMin % (24 * 60);
  const h = Math.floor(restoMin / 60);
  const m = restoMin % 60;

  if (d > 0) {
    return `em - ${d}d ${h}h ${m}min`;
  }

  return `em - ${h}h ${m}min`;
}

function getMonthRangeYmd(base = new Date()) {
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return {
    start: toYmd(firstDay),
    end: toYmd(lastDay),
  };
}

async function getAgendamentosHoje(params: { profissionalId?: string }) {
  const dataHoje = toYmd(new Date());
  const limit = 100;

  const first = await getAgendamentos({
    page: 1,
    limit,
    dataInicio: dataHoje,
    dataFim: dataHoje,
    ...(params.profissionalId ? { profissionalId: params.profissionalId } : {}),
  });

  const all = [...first.data];
  const totalPages = first.pagination.totalPages || 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await getAgendamentos({
      page,
      limit,
      dataInicio: dataHoje,
      dataFim: dataHoje,
      ...(params.profissionalId ? { profissionalId: params.profissionalId } : {}),
    });
    all.push(...next.data);
  }

  return all;
}

async function getAgendamentosLiberados(params: { profissionalId?: string }) {
  const limit = 100;
  const first = await getAgendamentos({
    page: 1,
    limit,
    status: 'LIBERADO',
    ...(params.profissionalId ? { profissionalId: params.profissionalId } : {}),
  });

  const all = [...first.data];
  const totalPages = first.pagination.totalPages || 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await getAgendamentos({
      page,
      limit,
      status: 'LIBERADO',
      ...(params.profissionalId ? { profissionalId: params.profissionalId } : {}),
    });
    all.push(...next.data);
  }

  return all;
}

async function getAgendamentosTotal(params: GetAgendamentosParams) {
  const response = await getAgendamentos({
    ...params,
    page: 1,
    limit: 1,
  });
  return response.pagination.total || 0;
}

async function getEvolucoesPendentesLiberados(agendamentosLiberados: Agendamento[]) {
  if (!agendamentosLiberados.length) return 0;

  const chunkSize = 100;
  let pendentes = 0;

  for (let index = 0; index < agendamentosLiberados.length; index += chunkSize) {
    const chunk = agendamentosLiberados.slice(index, index + chunkSize);
    const ids = chunk.map((item) => item.id);
    const statusEvolucoes = await getStatusEvolucoesPorAgendamentos(ids);
    const temEvolucaoById = new Map(statusEvolucoes.map((item) => [item.agendamentoId, item.temEvolucao]));

    pendentes += chunk.reduce((acc, item) => acc + (temEvolucaoById.get(item.id) === true ? 0 : 1), 0);
  }

  return pendentes;
}

function parseDashboardData(params: {
  agendamentosHoje: Agendamento[];
  agendamentosLiberados: Agendamento[];
  liberadosHoje: number;
  evolucoesPendentesLiberados: number;
  finalizadosMes: number;
  filaEsperaAtiva: number;
}): DashboardData {
  const { agendamentosHoje, agendamentosLiberados, liberadosHoje, evolucoesPendentesLiberados, finalizadosMes, filaEsperaAtiva } = params;
  const ativos = agendamentosHoje.filter((item) => item.status !== 'CANCELADO' && item.status !== 'ARQUIVADO');
  const solicitadosHoje = ativos.filter((item) => item.status === 'SOLICITADO').length;

  const proximosAtendimentos = agendamentosLiberados
    .filter((item) => item.status === 'LIBERADO')
    .filter((item) => {
      const date = new Date(item.dataHoraInicio);
      return !Number.isNaN(date.getTime()) && date.getTime() >= Date.now();
    })
    .sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime());

  return {
    liberadosHoje,
    evolucoesPendentesLiberados,
    finalizadosMes,
    solicitadosHoje,
    filaEsperaAtiva,
    proximosAtendimentos,
  };
}

function StatCard({
  icon,
  value,
  label,
  bgClassName,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  bgClassName: string;
}) {
  return (
    <View className={`flex-1 rounded-2xl px-3 py-3 ${bgClassName}`}>
      <View className="flex-row items-center justify-between">
        <Ionicons name={icon} size={19} color="#ffffff" />
        <AppText className="text-xl font-extrabold text-white">{value}</AppText>
      </View>
      <AppText className="mt-1 text-xs font-semibold text-white">{label}</AppText>
    </View>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <Pressable className={`w-[32%] rounded-2xl px-2 py-3 ${action.bgClassName}`} onPress={action.onPress}>
      <View className="items-center justify-center">
        <Ionicons name={action.icon} size={18} color="#ffffff" />
        <AppText className="mt-1.5 text-center text-[11px] font-semibold text-white">{action.label}</AppText>
      </View>
    </Pressable>
  );
}

export function DashboardScreen() {
  const router = useRouter();
  const { user, permissions } = useAuth();
  const { width: screenWidth } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({
    liberadosHoje: 0,
    evolucoesPendentesLiberados: 0,
    finalizadosMes: 0,
    solicitadosHoje: 0,
    filaEsperaAtiva: 0,
    proximosAtendimentos: [],
  });
  const [proximoCarouselIndex, setProximoCarouselIndex] = useState(0);
  const [proximosViewportWidth, setProximosViewportWidth] = useState(0);

  const canCreateAgendamento = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos', method: 'POST' }),
    [permissions],
  );
  const canCreatePaciente = useMemo(
    () => hasRoutePermission(permissions, { path: '/pacientes', method: 'POST' }),
    [permissions],
  );
  const canViewAgendamentos = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos', method: 'GET' }),
    [permissions],
  );
  const canViewPacientes = useMemo(
    () => hasRoutePermission(permissions, { path: '/pacientes', method: 'GET' }),
    [permissions],
  );
  const canViewAgenda = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos-calendario-profissional', method: 'GET' }),
    [permissions],
  );
  const canViewAtendimento = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos-atender-page', method: 'GET' }),
    [permissions],
  );
  const canViewRelease = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos-liberar/:id', method: 'PUT' }),
    [permissions],
  );
  const canViewReleaseParticular = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos-liberar-particular/:id', method: 'PUT' }),
    [permissions],
  );
  const canViewFila = useMemo(
    () => hasRoutePermission(permissions, { path: '/fila-de-espera', method: 'GET' }),
    [permissions],
  );

  const quickActions = useMemo(() => {
    const actions: QuickAction[] = [];

    if (canCreateAgendamento) {
      actions.push({
        id: 'novo-agendamento',
        label: 'Novo agendamento',
        icon: 'add-circle-outline',
        bgClassName: 'bg-blue-600',
        onPress: () => router.push(routes.agendamentosNew),
      });
    }

    if (canViewAgendamentos) {
      actions.push({
        id: 'agendamentos',
        label: 'Agendamentos',
        icon: 'calendar-outline',
        bgClassName: 'bg-blue-700',
        onPress: () => router.push(routes.tabsAgendamentos),
      });
    }

    if (canViewPacientes || canCreatePaciente) {
      actions.push({
        id: 'pacientes',
        label: 'Pacientes',
        icon: 'people-outline',
        bgClassName: 'bg-emerald-600',
        onPress: () => router.push(routes.tabsPacientes),
      });
    }

    if (canViewAgenda) {
      actions.push({
        id: 'agenda',
        label: 'Agenda',
        icon: 'today-outline',
        bgClassName: 'bg-indigo-600',
        onPress: () => router.push(routes.tabsAgenda),
      });
    }

    if (canViewRelease) {
      actions.push({
        id: 'liberacao-convenios',
        label: 'Liberar Convênios',
        icon: 'shield-checkmark-outline',
        bgClassName: 'bg-cyan-600',
        onPress: () => router.push(routes.tabsRelease),
      });
    }

    if (canViewReleaseParticular) {
      actions.push({
        id: 'liberacao-particulares',
        label: 'Liberar Particulares',
        icon: 'cash-outline',
        bgClassName: 'bg-teal-600',
        onPress: () => router.push(routes.tabsReleaseParticular),
      });
    }

    if (canViewAtendimento) {
      actions.push({
        id: 'atendimento',
        label: 'Atendimento',
        icon: 'medkit-outline',
        bgClassName: 'bg-amber-500',
        onPress: () => router.push(routes.tabsAtendimento),
      });
    }

    if (!actions.length) {
      actions.push({
        id: 'agendamentos-fallback',
        label: 'Agendamentos',
        icon: 'calendar-outline',
        bgClassName: 'bg-blue-600',
        onPress: () => router.push(routes.tabsAgendamentos),
      });
    }

    return actions;
  }, [
    canCreateAgendamento,
    canCreatePaciente,
    canViewAgenda,
    canViewAgendamentos,
    canViewAtendimento,
    canViewPacientes,
    canViewRelease,
    canViewReleaseParticular,
    router,
  ]);

  const carouselItemWidth = useMemo(() => {
    if (proximosViewportWidth > 0) {
      return proximosViewportWidth;
    }
    return Math.max(Math.round(screenWidth - 64), 240);
  }, [proximosViewportWidth, screenWidth]);
  const carouselStep = useMemo(() => carouselItemWidth, [carouselItemWidth]);
  const totalProximos = data.proximosAtendimentos.length;
  const currentProximoIndex = totalProximos ? Math.min(proximoCarouselIndex, totalProximos - 1) : 0;

  useEffect(() => {
    setProximoCarouselIndex((current) => {
      if (!data.proximosAtendimentos.length) return 0;
      return Math.min(current, data.proximosAtendimentos.length - 1);
    });
  }, [data.proximosAtendimentos.length]);

  const handleOpenProximoAtendimento = useCallback(
    (proximo: Agendamento) => {
      if (!proximo?.id || !proximo.pacienteId) return;

      router.push(
        routes.atendimentoActions({
          agendamentoId: proximo.id,
          pacienteId: proximo.pacienteId,
          ...(proximo.pacienteNome ? { pacienteNome: proximo.pacienteNome } : {}),
          ...(proximo.profissionalId ? { profissionalId: proximo.profissionalId } : {}),
          ...(proximo.profissionalNome ? { profissionalNome: proximo.profissionalNome } : {}),
          ...(proximo.convenioId ? { convenioId: proximo.convenioId } : {}),
          ...(proximo.tipoAtendimento ? { tipoAtendimento: proximo.tipoAtendimento } : {}),
          ...(proximo.dataCodLiberacao ? { dataCodLiberacao: proximo.dataCodLiberacao } : {}),
          ...(proximo.dataHoraInicio ? { dataHoraInicio: proximo.dataHoraInicio } : {}),
          ...(proximo.servicoNome ? { servicoNome: proximo.servicoNome } : {}),
          ...(proximo.status ? { status: proximo.status } : {}),
          ...(proximo.compareceu !== undefined ? { compareceu: proximo.compareceu } : {}),
          ...(proximo.assinaturaPaciente !== undefined ? { assinaturaPaciente: proximo.assinaturaPaciente } : {}),
          ...(proximo.assinaturaProfissional !== undefined ? { assinaturaProfissional: proximo.assinaturaProfissional } : {}),
          ...(proximo.motivoReprovacao ? { motivoReprovacao: proximo.motivoReprovacao } : {}),
        }),
      );
    },
    [router],
  );

  const handleProximosScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (!totalProximos) return;
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / carouselStep);
      const bounded = Math.max(0, Math.min(nextIndex, totalProximos - 1));
      setProximoCarouselIndex(bounded);
    },
    [carouselStep, totalProximos],
  );

  const loadDashboard = useCallback(async (options?: { showSkeleton?: boolean }) => {
    const showSkeleton = options?.showSkeleton ?? true;
    if (showSkeleton) {
      setLoading(true);
    }
    setError(null);

    try {
      const rolesNormalized = (user?.roles || []).map((item) => item.toUpperCase());
      const isProfissional = rolesNormalized.some((role) => role === 'PROFISSIONAL' || role.includes('PROFISSIONAL'));

      let profissionalId: string | undefined;
      if (isProfissional) {
        const meuProfissional = await getMeuProfissional();
        profissionalId = meuProfissional.id;
      }

      const hoje = toYmd(new Date());
      const monthRange = getMonthRangeYmd(new Date());
      const agendamentosLiberadosPromise = getAgendamentosLiberados({ profissionalId });

      const [agendamentosHoje, agendamentosLiberados, liberadosHoje, finalizadosMes, filaEspera] = await Promise.all([
        getAgendamentosHoje({ profissionalId }),
        agendamentosLiberadosPromise,
        getAgendamentosTotal({
          status: 'LIBERADO',
          dataInicio: hoje,
          dataFim: hoje,
          ...(profissionalId ? { profissionalId } : {}),
        }),
        getAgendamentosTotal({
          status: 'FINALIZADO',
          dataInicio: monthRange.start,
          dataFim: monthRange.end,
          ...(profissionalId ? { profissionalId } : {}),
        }),
        canViewFila ? getFilaEspera({ ativo: true }) : Promise.resolve([]),
      ]);
      const evolucoesPendentesLiberados = await getEvolucoesPendentesLiberados(agendamentosLiberados);

      setData(
        parseDashboardData({
          agendamentosHoje,
          agendamentosLiberados,
          liberadosHoje,
          evolucoesPendentesLiberados,
          finalizadosMes,
          filaEsperaAtiva: filaEspera.length,
        }),
      );
    } catch (err) {
      setError(parseApiError(err, 'Não foi possível carregar os indicadores da Home.'));
      setData({
        liberadosHoje: 0,
        evolucoesPendentesLiberados: 0,
        finalizadosMes: 0,
        solicitadosHoje: 0,
        filaEsperaAtiva: 0,
        proximosAtendimentos: [],
      });
    } finally {
      if (showSkeleton) {
        setLoading(false);
      }
    }
  }, [canViewFila, user?.roles]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDashboard({ showSkeleton: false });
    } finally {
      setRefreshing(false);
    }
  }, [loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard({ showSkeleton: true });
    }, [loadDashboard]),
  );

  if (loading) {
    return (
      <AppScreen contentClassName="px-4 pt-2 pb-3">
        <View className="flex-1 gap-3">
          <SkeletonBlock lines={3} />
          <SkeletonBlock lines={3} />
          <View className="flex-1">
            <SkeletonBlock lines={8} />
          </View>
        </View>
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen contentClassName="px-4 pt-2 pb-3">
        <View className="flex-1 justify-center">
          <ErrorState description={error} onRetry={() => void loadDashboard()} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen contentClassName="px-4 pt-2 pb-3">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />}
      >
        <View className="rounded-3xl border border-surface-border bg-surface-card p-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <AppText className="text-3xl font-extrabold text-slate-800">Olá, {getPrimeiroNome(user?.nome)}</AppText>
              <AppText className="mt-1 text-base font-semibold text-slate-600">Bom trabalho hoje!</AppText>
            </View>
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              onPress={() => router.push(routes.notifications)}
            >
              <Ionicons name="notifications-outline" size={20} color="#334155" />
            </Pressable>
          </View>

          <View className="mt-3 flex-row gap-2">
            <StatCard icon="calendar-outline" value={data.liberadosHoje} label="Liberados hoje" bgClassName="bg-blue-600" />
              <StatCard
                icon="document-text-outline"
                value={data.evolucoesPendentesLiberados}
                label="Evoluções pendentes"
                bgClassName="bg-orange-500"
              />
              <StatCard icon="checkmark-circle-outline" value={data.finalizadosMes} label="Finalizados no mês" bgClassName="bg-emerald-600" />
            </View>
          </View>

        <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons name="navigate-circle-outline" size={20} color="#0284c7" />
              <AppText className="text-sm font-semibold text-content-primary">Próximo atendimento</AppText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={totalProximos ? '#94a3b8' : '#cbd5e1'} />
          </View>

          {totalProximos ? (
            <View className="mt-2">
              <View
                className="overflow-hidden"
                onLayout={(event) => {
                  const width = Math.round(event.nativeEvent.layout.width);
                  if (width && width !== proximosViewportWidth) {
                    setProximosViewportWidth(width);
                  }
                }}
              >
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={carouselStep}
                  snapToAlignment="start"
                  disableIntervalMomentum
                  bounces={false}
                  alwaysBounceHorizontal={false}
                  style={{ width: carouselItemWidth }}
                  contentContainerStyle={{ paddingHorizontal: 0, marginHorizontal: 0 }}
                  onMomentumScrollEnd={handleProximosScrollEnd}
                >
                  {data.proximosAtendimentos.map((item) => (
                    <View key={item.id} style={{ width: carouselItemWidth }}>
                      <Pressable
                        onPress={() => handleOpenProximoAtendimento(item)}
                        className="rounded-xl border border-surface-border bg-slate-50 px-3 py-3"
                        style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
                      >
                        <AppText numberOfLines={1} className="text-base font-semibold text-slate-800">
                          {item.pacienteNome || 'Paciente não informado'}
                        </AppText>
                        <AppText className="mt-1 text-sm text-content-secondary">
                          {formatHora(item.dataHoraInicio)} • {item.servicoNome || 'Consulta'} • {formatTempoRestante(item.dataHoraInicio)}
                        </AppText>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View className="mt-2 flex-row items-center justify-between">
                <AppText className="text-xs text-content-muted">
                  {currentProximoIndex + 1} de {totalProximos}
                </AppText>
                <View className="flex-row gap-1">
                  {data.proximosAtendimentos.map((item, index) => (
                    <View
                      key={`dot-${item.id}`}
                      className={`h-2 w-2 rounded-full ${index === currentProximoIndex ? 'bg-brand-700' : 'bg-slate-300'}`}
                    />
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <AppText className="mt-2 text-sm text-content-secondary">Sem próximos atendimentos para hoje.</AppText>
          )}
        </View>

        <View className="rounded-3xl border border-surface-border bg-surface-card p-4">
          <AppText className="text-sm font-semibold text-content-primary">Ações rápidas</AppText>

          <View className="mt-3 flex-row flex-wrap justify-between gap-y-2">
            {quickActions.map((action) => (
              <QuickActionCard key={action.id} action={action} />
            ))}
          </View>

          <View className="mt-4 rounded-2xl border border-surface-border bg-slate-50 p-3">
            <View className="mb-2 flex-row items-center gap-2">
              <Ionicons name="warning-outline" size={18} color="#ea580c" />
              <AppText className="text-sm font-semibold text-content-primary">Alertas</AppText>
            </View>

            <View className="gap-2">
              <View className="flex-row items-center justify-between rounded-xl bg-white px-3 py-2">
                <AppText className="text-sm text-content-primary">Liberações pendentes</AppText>
                <AppText className="text-sm font-bold text-orange-600">{data.solicitadosHoje}</AppText>
              </View>

              {canViewFila ? (
                <View className="flex-row items-center justify-between rounded-xl bg-white px-3 py-2">
                  <AppText className="text-sm text-content-primary">Fila de espera ativa</AppText>
                  <AppText className="text-sm font-bold text-cyan-700">{data.filaEsperaAtiva}</AppText>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}
