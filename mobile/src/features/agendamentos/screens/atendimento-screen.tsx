import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBlock } from '@/components/feedback/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { BackToTopButton } from '@/components/ui/back-to-top-button';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { SearchBar } from '@/components/ui/search-bar';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import { getAgendamentos, getConfiguracoesByEntity, getMeuProfissional, getStatusEvolucoesPorAgendamentos } from '@/features/agendamentos/services/agendamentos-api';
import type { Agendamento } from '@/features/agendamentos/types';
import { getConvenios } from '@/features/customers/services/patients-api';
import { routes } from '@/navigation/routes';
import { useToast } from '@/providers/toast-provider';
import { applyDateMaskSlash, dateBrSlashToIso, isValidDateBrSlash } from '@/utils/date';

type AtendimentoConfig = {
  evolucao: boolean;
  compareceu: boolean;
  assinatura_paciente: boolean;
  assinatura_profissional: boolean;
};

const DEFAULT_CONFIG: AtendimentoConfig = {
  evolucao: true,
  compareceu: true,
  assinatura_paciente: true,
  assinatura_profissional: true,
};

const ALL_CONVENIOS_VALUE = 'todos';

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

function getContexto(tipoAtendimento?: string) {
  return tipoAtendimento === 'online' ? 'atender_page_online' : 'atender_page_presencial';
}

function parseConfigValue(value: unknown) {
  return value === true || value === 'true';
}

function normalizeRoles(roles: unknown[] | undefined) {
  return (roles || []).map((role) => {
    if (typeof role === 'string') {
      return role.toUpperCase();
    }
    if (role && typeof role === 'object') {
      const roleAny = role as { nome?: string; name?: string; role?: string; tipo?: string };
      return String(roleAny.nome || roleAny.name || roleAny.role || roleAny.tipo || '').toUpperCase();
    }
    return String(role).toUpperCase();
  });
}

export function AtendimentoScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, permissions } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [queryDebounced, setQueryDebounced] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [onlyPendingEvolutions, setOnlyPendingEvolutions] = useState(false);
  const [convenioFilter, setConvenioFilter] = useState(ALL_CONVENIOS_VALUE);
  const [conveniosCatalog, setConveniosCatalog] = useState<Array<{ id: string; nome: string }>>([]);
  const [dataInicioInput, setDataInicioInput] = useState('');
  const [dataFimInput, setDataFimInput] = useState('');
  const [dataInicioFilter, setDataInicioFilter] = useState('');
  const [dataFimFilter, setDataFimFilter] = useState('');
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [configsMap, setConfigsMap] = useState<Map<string, AtendimentoConfig>>(new Map());
  const [evolucoesMap, setEvolucoesMap] = useState<Map<string, boolean>>(new Map());
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const listRef = useRef<FlatList<Agendamento> | null>(null);

  const canAccessPage = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos-atender-page', method: 'GET' }),
    [permissions],
  );

  const canViewEvolucoes = useMemo(() => hasRoutePermission(permissions, { path: '/evolucoes', method: 'GET' }), [permissions]);

  useEffect(() => {
    const timer = setTimeout(() => setQueryDebounced(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;

    async function loadConveniosCatalog() {
      try {
        const response = await getConvenios();
        if (!active) return;

        setConveniosCatalog(
          response
            .filter((item) => Boolean(item?.id && item?.nome))
            .map((item) => ({ id: item.id, nome: item.nome }))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })),
        );
      } catch {
        if (!active) return;
        setConveniosCatalog([]);
      }
    }

    void loadConveniosCatalog();

    return () => {
      active = false;
    };
  }, []);

  const applyDataInicioFilter = useCallback(
    (rawValue: string) => {
      const value = rawValue.trim();

      if (!value) {
        setDataInicioInput('');
        setDataInicioFilter('');
        return;
      }

      if (!isValidDateBrSlash(value)) {
        showToast({ message: 'Data início inválida. Use DD/MM/AAAA.' });
        setDataInicioInput(dataInicioFilter);
        return;
      }

      const nextInicioIso = dateBrSlashToIso(value);
      const fimIso = dateBrSlashToIso(dataFimFilter);
      if (nextInicioIso && fimIso && nextInicioIso > fimIso) {
        showToast({ message: 'Data início não pode ser maior que data fim.' });
        setDataInicioInput(dataInicioFilter);
        return;
      }

      setDataInicioInput(value);
      setDataInicioFilter(value);
    },
    [dataFimFilter, dataInicioFilter, showToast],
  );

  const applyDataFimFilter = useCallback(
    (rawValue: string) => {
      const value = rawValue.trim();

      if (!value) {
        setDataFimInput('');
        setDataFimFilter('');
        return;
      }

      if (!isValidDateBrSlash(value)) {
        showToast({ message: 'Data fim inválida. Use DD/MM/AAAA.' });
        setDataFimInput(dataFimFilter);
        return;
      }

      const inicioIso = dateBrSlashToIso(dataInicioFilter);
      const nextFimIso = dateBrSlashToIso(value);
      if (inicioIso && nextFimIso && nextFimIso < inicioIso) {
        showToast({ message: 'Data fim não pode ser menor que data início.' });
        setDataFimInput(dataFimFilter);
        return;
      }

      setDataFimInput(value);
      setDataFimFilter(value);
    },
    [dataFimFilter, dataInicioFilter, showToast],
  );

  const getConfigFor = useCallback(
    (agendamento: Agendamento) => {
      return configsMap.get(agendamento.id) || DEFAULT_CONFIG;
    },
    [configsMap],
  );

  const loadConfigs = useCallback(async (list: Agendamento[], mode: 'replace' | 'append') => {
    if (!list.length) {
      if (mode === 'replace') {
        setConfigsMap(new Map());
      }
      return;
    }

    const unique = new Map<string, { convenioId?: string; contexto: string }>();
    list.forEach((item) => {
      const contexto = getContexto(item.tipoAtendimento);
      const key = `${item.convenioId || 'sem-convenio'}:${contexto}`;
      if (!unique.has(key)) {
        unique.set(key, { convenioId: item.convenioId, contexto });
      }
    });

    const resolved = new Map<string, AtendimentoConfig>();

    await Promise.all(
      Array.from(unique.entries()).map(async ([key, value]) => {
        if (!value.convenioId) {
          resolved.set(key, DEFAULT_CONFIG);
          return;
        }

        try {
          const response = await getConfiguracoesByEntity({
            entidadeTipo: 'convenio',
            entidadeId: value.convenioId,
            contexto: value.contexto,
          });

          const hasAnyConfig = Object.keys(response || {}).length > 0;
          if (!hasAnyConfig) {
            resolved.set(key, DEFAULT_CONFIG);
            return;
          }

          resolved.set(key, {
            evolucao: parseConfigValue(response.evolucao),
            compareceu: parseConfigValue(response.compareceu),
            assinatura_paciente: parseConfigValue(response.assinatura_paciente),
            assinatura_profissional: parseConfigValue(response.assinatura_profissional),
          });
        } catch {
          resolved.set(key, DEFAULT_CONFIG);
        }
      }),
    );

    const byAppointment = new Map<string, AtendimentoConfig>();
    list.forEach((item) => {
      const key = `${item.convenioId || 'sem-convenio'}:${getContexto(item.tipoAtendimento)}`;
      byAppointment.set(item.id, resolved.get(key) || DEFAULT_CONFIG);
    });

    setConfigsMap((current) => {
      if (mode === 'replace') {
        return byAppointment;
      }
      const merged = new Map(current);
      byAppointment.forEach((value, key) => merged.set(key, value));
      return merged;
    });
  }, []);

  const loadEvolucoesStatus = useCallback(
    async (list: Agendamento[], mode: 'replace' | 'append') => {
      if (!list.length || !canViewEvolucoes) {
        if (mode === 'replace') {
          setEvolucoesMap(new Map());
        }
        return;
      }

      try {
        const ids = list.map((item) => item.id);
        const response = await getStatusEvolucoesPorAgendamentos(ids);
        const next = new Map<string, boolean>();
        response.forEach((item) => {
          next.set(item.agendamentoId, item.temEvolucao);
        });

        setEvolucoesMap((current) => {
          if (mode === 'replace') {
            return next;
          }
          const merged = new Map(current);
          next.forEach((value, key) => merged.set(key, value));
          return merged;
        });
      } catch {
        const fallback = new Map<string, boolean>();
        list.forEach((item) => fallback.set(item.id, false));
        setEvolucoesMap((current) => {
          if (mode === 'replace') {
            return fallback;
          }
          const merged = new Map(current);
          fallback.forEach((value, key) => merged.set(key, value));
          return merged;
        });
      }
    },
    [canViewEvolucoes],
  );

  const convenioOptions = useMemo(() => {
    const map = new Map<string, string>();

    conveniosCatalog.forEach((item) => {
      if (item.id && item.nome) {
        map.set(item.id, item.nome);
      }
    });

    agendamentos.forEach((item) => {
      if (item.convenioId) {
        map.set(item.convenioId, item.convenioNome || item.convenio?.nome || 'Não informado');
      }
    });

    const values = Array.from(map.entries())
      .map(([id, nome]) => ({ value: id, label: nome }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }));

    return [{ value: ALL_CONVENIOS_VALUE, label: 'Todos os convênios' }, ...values];
  }, [agendamentos, conveniosCatalog]);

  const visibleAgendamentos = useMemo(() => {
    if (!onlyPendingEvolutions) {
      return agendamentos;
    }

    return agendamentos.filter((item) => {
      const config = configsMap.get(item.id) || DEFAULT_CONFIG;
      const hasEvolucao = evolucoesMap.get(item.id) === true;
      return config.evolucao && !hasEvolucao;
    });
  }, [agendamentos, configsMap, evolucoesMap, onlyPendingEvolutions]);

  const hasActiveFilters = useMemo(
    () =>
      onlyPendingEvolutions ||
      convenioFilter !== ALL_CONVENIOS_VALUE ||
      Boolean(dataInicioFilter) ||
      Boolean(dataFimFilter),
    [convenioFilter, dataFimFilter, dataInicioFilter, onlyPendingEvolutions],
  );

  const fetchPage = useCallback(
    async (pageToLoad: number, mode: 'replace' | 'append', isRefresh = false) => {
      if (!canAccessPage) {
        setError('Você não tem permissão para acessar esta página.');
        setLoading(false);
        return;
      }

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
        const normalizedRoles = normalizeRoles(user?.roles as unknown[] | undefined);
        const hasRolesInfo = normalizedRoles.length > 0;
        const isProfissionalByRole = normalizedRoles.some((role) => role === 'PROFISSIONAL' || role.includes('PROFISSIONAL'));
        const isProfissional = hasRolesInfo ? isProfissionalByRole : Boolean(user?.profissionalId);

        const params: {
          page: number;
          limit: number;
          status: 'LIBERADO';
          search?: string;
          profissionalId?: string;
          convenioId?: string;
          dataInicio?: string;
          dataFim?: string;
          orderBy: 'dataHoraInicio';
          orderDirection: 'asc';
        } = {
          page: pageToLoad,
          limit,
          status: 'LIBERADO',
          orderBy: 'dataHoraInicio',
          orderDirection: 'asc',
        };

        if (queryDebounced) {
          params.search = queryDebounced;
        }

        const dataInicioIso = dataInicioFilter ? dateBrSlashToIso(dataInicioFilter) : null;
        const dataFimIso = dataFimFilter ? dateBrSlashToIso(dataFimFilter) : null;

        if (convenioFilter && convenioFilter !== ALL_CONVENIOS_VALUE) {
          params.convenioId = convenioFilter;
        }

        if (dataInicioIso) {
          params.dataInicio = dataInicioIso;
        }

        if (dataFimIso) {
          params.dataFim = dataFimIso;
        }

        if (isProfissional) {
          const profissionalIdUsuario = user?.profissionalId || null;
          const profissionalId = profissionalIdUsuario || (await getMeuProfissional()).id;
          params.profissionalId = profissionalId;
        }

        const response = await getAgendamentos(params);
        const ordered = [...response.data].sort((a, b) => {
          const da = new Date(a.dataHoraInicio).getTime();
          const db = new Date(b.dataHoraInicio).getTime();
          return da - db;
        });

        setAgendamentos((current) => {
          if (mode === 'replace' || pageToLoad === 1) {
            return ordered;
          }

          const merged = [...current];
          const existingIds = new Set(current.map((item) => item.id));
          for (const item of ordered) {
            if (!existingIds.has(item.id)) {
              merged.push(item);
            }
          }
          return merged;
        });

        setPage(pageToLoad);
        setTotal(response.pagination.total);
        setTotalPages(response.pagination.totalPages || 1);

        await Promise.all([loadConfigs(ordered, mode), loadEvolucoesStatus(ordered, mode)]);
      } catch (err) {
        if (pageToLoad === 1 || isRefresh) {
          setError(parseApiError(err, 'Não foi possível carregar os agendamentos para atendimento.'));
        } else {
          showToast({ message: parseApiError(err, 'Não foi possível carregar mais atendimentos.') });
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
    [
      canAccessPage,
      convenioFilter,
      dataFimFilter,
      dataInicioFilter,
      limit,
      loadConfigs,
      loadEvolucoesStatus,
      queryDebounced,
      showToast,
      user?.profissionalId,
      user?.roles,
    ],
  );

  useEffect(() => {
    void fetchPage(1, 'replace');
  }, [fetchPage]);

  useFocusEffect(
    useCallback(() => {
      void fetchPage(1, 'replace', true);
      return undefined;
    }, [fetchPage]),
  );

  const handleEndReached = useCallback(() => {
    if (loading || refreshing || loadingMore) return;
    if (page >= totalPages) return;
    void fetchPage(page + 1, 'append');
  }, [fetchPage, loading, loadingMore, page, refreshing, totalPages]);

  const getNextAtendimentoIndex = useCallback(() => {
    if (!visibleAgendamentos.length) {
      return -1;
    }

    const now = Date.now();
    const nextIndex = visibleAgendamentos.findIndex((item) => {
      const timestamp = new Date(item.dataHoraInicio).getTime();
      return Number.isFinite(timestamp) && timestamp >= now;
    });

    if (nextIndex >= 0) {
      return nextIndex;
    }

    return 0;
  }, [visibleAgendamentos]);

  const handleGoToProximoAtendimento = useCallback(() => {
    const nextIndex = getNextAtendimentoIndex();

    if (nextIndex < 0) {
      showToast({ message: 'Nenhum atendimento disponível na lista.' });
      return;
    }

    listRef.current?.scrollToIndex({
      index: nextIndex,
      animated: true,
      viewPosition: 0,
    });
  }, [getNextAtendimentoIndex, showToast]);

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      const fallbackOffset = Math.max(0, info.index * (info.averageItemLength || 180));
      listRef.current?.scrollToOffset({ offset: fallbackOffset, animated: true });
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: info.index,
          animated: true,
          viewPosition: 0,
        });
      }, 120);
    },
    [],
  );

  const header = (
    <View className="mb-3 gap-3">
      <PageHeader title="Atendimento" subtitle="Agendamentos liberados para atendimento" />
      <View className="rounded-2xl border border-surface-border bg-surface-card p-3">
        <View className="mb-2 flex-row items-center justify-between gap-2">
          <AppText className="text-sm font-semibold text-content-primary">Filtros</AppText>
          <Pressable
            onPress={() => setFiltersExpanded((current) => !current)}
            className="h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-slate-100"
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
          >
            <Ionicons name={filtersExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#334155" />
          </Pressable>
        </View>

        {filtersExpanded ? (
          <View className="gap-3">
            <Pressable
              onPress={() => setOnlyPendingEvolutions((current) => !current)}
              className="flex-row items-center gap-3"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: onlyPendingEvolutions }}
            >
              <View
                className={
                  onlyPendingEvolutions
                    ? 'h-5 w-5 items-center justify-center rounded border border-brand-700 bg-brand-700'
                    : 'h-5 w-5 items-center justify-center rounded border border-surface-border bg-white'
                }
              >
                {onlyPendingEvolutions ? <AppText className="text-[11px] font-bold text-white">X</AppText> : null}
              </View>
              <AppText className="text-sm font-semibold text-content-primary">Evoluções pendentes</AppText>
            </Pressable>

            <Select
              label="Convênio"
              value={convenioFilter}
              onChange={setConvenioFilter}
              options={convenioOptions}
              placeholder="Todos os convênios"
            />

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input
                  label="Data início"
                  value={dataInicioInput}
                  onChangeText={(value) => setDataInicioInput(applyDateMaskSlash(value))}
                  onBlur={() => applyDataInicioFilter(dataInicioInput)}
                  placeholder="DD/MM/AAAA"
                  keyboardType="number-pad"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Data fim"
                  value={dataFimInput}
                  onChangeText={(value) => setDataFimInput(applyDateMaskSlash(value))}
                  onBlur={() => applyDataFimFilter(dataFimInput)}
                  placeholder="DD/MM/AAAA"
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>
        ) : null}
      </View>
      <SearchBar placeholder="Buscar paciente, serviço ou profissional..." value={query} onChangeText={setQuery} />
      <AppText className="text-xs font-semibold text-content-muted">
        Exibindo {visibleAgendamentos.length} de {total} atendimentos
      </AppText>
      <View className="flex-row gap-2">
        <Button
          variant="secondary"
          size="sm"
          label={refreshing ? 'Atualizando...' : 'Atualizar lista'}
          className="flex-1"
          onPress={() => void fetchPage(1, 'replace', true)}
          disabled={refreshing}
        />
        <Button
          variant="secondary"
          size="sm"
          label="Próximo atendimento"
          className="flex-1"
          onPress={handleGoToProximoAtendimento}
          disabled={!visibleAgendamentos.length}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <AppScreen>
        {header}
        <SkeletonBlock lines={10} />
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
      {header}
      <FlatList
        ref={listRef}
        className="mt-1"
        data={visibleAgendamentos}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum atendimento liberado"
            description={
              queryDebounced || hasActiveFilters
                ? 'Tente ajustar os filtros para encontrar resultados.'
                : 'Não há agendamentos liberados no momento.'
            }
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
        onScrollToIndexFailed={handleScrollToIndexFailed}
        onScroll={(event) => setShowBackToTop(event.nativeEvent.contentOffset.y > 280)}
        scrollEventThrottle={16}
        renderItem={({ item }) => {
          const config = getConfigFor(item);
          const hasEvolucao = evolucoesMap.get(item.id) === true;
          const pendingBadges: Array<{ label: string; tone: 'warning' | 'danger' }> = [];
          const totalRequired = [config.evolucao, config.compareceu, config.assinatura_paciente, config.assinatura_profissional].filter(Boolean).length;
          const respostas = [
            config.evolucao ? hasEvolucao : true,
            config.compareceu ? item.compareceu !== null && item.compareceu !== undefined : true,
            config.assinatura_paciente ? item.assinaturaPaciente !== null && item.assinaturaPaciente !== undefined : true,
            config.assinatura_profissional ? item.assinaturaProfissional !== null && item.assinaturaProfissional !== undefined : true,
          ].filter(Boolean).length;

          const prontoParaAprovar =
            (!config.evolucao || hasEvolucao) &&
            (!config.compareceu || (item.compareceu !== null && item.compareceu !== undefined)) &&
            (!config.assinatura_paciente || item.assinaturaPaciente === true) &&
            (!config.assinatura_profissional || item.assinaturaProfissional === true);

          const cardAccentClass =
            totalRequired === 0
              ? 'bg-emerald-500'
              : respostas === 0
                ? 'bg-red-500'
                : prontoParaAprovar
                  ? 'bg-emerald-500'
                  : 'bg-amber-500';
          const cardContainerClass = prontoParaAprovar || totalRequired === 0 ? 'bg-emerald-50' : 'bg-surface-card';

          if (config.evolucao && !hasEvolucao) {
            pendingBadges.push({ label: 'Evolução', tone: 'warning' });
          }

          if (config.compareceu && (item.compareceu === null || item.compareceu === undefined)) {
            pendingBadges.push({ label: 'Comparecimento', tone: 'warning' });
          }

          if (config.assinatura_paciente && item.assinaturaPaciente !== true) {
            pendingBadges.push({
              label: 'Ass. Paciente',
              tone: item.assinaturaPaciente === false ? 'danger' : 'warning',
            });
          }

          if (config.assinatura_profissional && item.assinaturaProfissional !== true) {
            pendingBadges.push({
              label: 'Ass. Profissional',
              tone: item.assinaturaProfissional === false ? 'danger' : 'warning',
            });
          }

          if (item.motivoReprovacao?.trim()) {
            pendingBadges.push({ label: 'Pendências', tone: 'danger' });
          }

          return (
            <Pressable
              key={item.id}
              onPress={() =>
                router.push(
                  routes.atendimentoActions({
                    agendamentoId: item.id,
                    pacienteId: item.pacienteId,
                    pacienteNome: item.pacienteNome || item.paciente?.nomeCompleto || '',
                    profissionalId: item.profissionalId,
                    profissionalNome: item.profissionalNome || item.profissional?.nome || '',
                    convenioId: item.convenioId,
                    tipoAtendimento: item.tipoAtendimento,
                    urlMeet: item.urlMeet || '',
                    dataCodLiberacao: item.dataCodLiberacao || '',
                    dataHoraInicio: item.dataHoraInicio,
                    servicoNome: item.servicoNome || item.servico?.nome || '',
                    status: item.status,
                    hasEvolucao,
                    compareceu: item.compareceu,
                    assinaturaPaciente: item.assinaturaPaciente,
                    assinaturaProfissional: item.assinaturaProfissional,
                    motivoReprovacao: item.motivoReprovacao,
                  }),
                )
              }
              className={`rounded-2xl border border-surface-border p-4 ${cardContainerClass}`}
              style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
            >
              <View className={`mb-3 h-1 rounded-full ${cardAccentClass}`} />
              <View className="flex-row items-start justify-between gap-2">
                <AppText numberOfLines={1} className="flex-1 text-base font-semibold text-content-primary">
                  Nome Paciente: {item.pacienteNome || 'Não informado'}
                </AppText>
                <Chip label={item.status} tone={item.status === 'LIBERADO' ? 'success' : 'neutral'} />
              </View>

              <View className="mt-1 flex-row items-start justify-between gap-3">
                <AppText className="flex-1 text-xs text-content-secondary">Data e Hora: {formatDateTime(item.dataHoraInicio)}</AppText>
                <AppText className="text-xs text-content-secondary">Tipo: {item.tipoAtendimento || 'Não informado'}</AppText>
              </View>

              <AppText className="mt-1 text-xs text-content-secondary">Profissional: {item.profissionalNome || 'Não informado'}</AppText>
              <AppText className="mt-1 text-xs text-content-secondary">Serviço: {item.servicoNome || 'Não informado'}</AppText>

              {pendingBadges.length > 0 ? (
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {pendingBadges.map((badge) => (
                    <Chip key={`${item.id}-${badge.label}`} label={badge.label} tone={badge.tone} />
                  ))}
                </View>
              ) : null}

            </Pressable>
          );
        }}
      />
      <BackToTopButton visible={showBackToTop} onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} />
    </AppScreen>
  );
}

