import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBlock } from '@/components/feedback/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { BackToTopButton } from '@/components/ui/back-to-top-button';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { SearchBar } from '@/components/ui/search-bar';
import { getAgendamentos, getPrecosParticulares } from '@/features/agendamentos/services/agendamentos-api';
import type { Agendamento, PrecoParticular } from '@/features/agendamentos/types';
import { routes } from '@/navigation/routes';
import { useToast } from '@/providers/toast-provider';

const CONVENIO_PARTICULAR_ID = 'f4af6586-8b56-4cf3-8b87-d18605cea381';

type AgendamentoAgrupado = {
  kind: 'group';
  id: string;
  pacienteId: string;
  pacienteNome: string;
  servicoId: string;
  servicoNome: string;
  profissionalId: string;
  profissionalNome: string;
  mesAno: string;
  mesAnoDisplay: string;
  mesAnoOtimizado: string;
  precoUnitario: number;
  precoTotal: number;
  quantidadeAgendamentos: number;
  tipoPagamento: string;
  status: 'AGENDADO' | 'SOLICITADO';
  agendamentos: Agendamento[];
  firstAgendamento: Agendamento;
};

type ReleaseParticularItem = Agendamento | AgendamentoAgrupado;

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

function formatMoney(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Não informado';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatMesAno(mesAno: string) {
  const [ano, mes] = mesAno.split('-');
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${meses[Math.max(0, Number(mes) - 1)]} ${ano}`;
}

function formatMesAnoOtimizado(mesAno: string) {
  const [ano, mes] = mesAno.split('-');
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[Math.max(0, Number(mes) - 1)]}${ano.slice(-2)}`;
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

function isGrouped(item: ReleaseParticularItem): item is AgendamentoAgrupado {
  return 'kind' in item && item.kind === 'group';
}

function agruparAgendamentos(agendamentos: Agendamento[], precosParticulares: PrecoParticular[]) {
  const precoByPacienteServico = new Map<string, PrecoParticular>();
  for (const preco of precosParticulares) {
    precoByPacienteServico.set(`${preco.pacienteId}-${preco.servicoId}`, preco);
  }

  const agrupados = new Map<string, AgendamentoAgrupado>();
  const individuais: Agendamento[] = [];

  for (const agendamento of agendamentos) {
    const preco = precoByPacienteServico.get(`${agendamento.pacienteId}-${agendamento.servicoId}`);

    if (!preco || preco.tipoPagamento !== 'Mensal') {
      individuais.push(agendamento);
      continue;
    }

    const dataAgendamento = new Date(agendamento.dataHoraInicio);
    const mesAno = `${dataAgendamento.getFullYear()}-${String(dataAgendamento.getMonth() + 1).padStart(2, '0')}`;
    const chave = `${agendamento.pacienteId}-${agendamento.servicoId}-${mesAno}`;

    const existente = agrupados.get(chave);
    if (!existente) {
      agrupados.set(chave, {
        kind: 'group',
        id: `grupo-${chave}`,
        pacienteId: agendamento.pacienteId,
        pacienteNome: agendamento.pacienteNome || 'Paciente não informado',
        servicoId: agendamento.servicoId,
        servicoNome: agendamento.servicoNome || 'Serviço não informado',
        profissionalId: agendamento.profissionalId,
        profissionalNome: agendamento.profissionalNome || 'Profissional não informado',
        mesAno,
        mesAnoDisplay: formatMesAno(mesAno),
        mesAnoOtimizado: formatMesAnoOtimizado(mesAno),
        precoUnitario: preco.preco,
        precoTotal: preco.preco,
        quantidadeAgendamentos: 1,
        tipoPagamento: preco.tipoPagamento || 'Mensal',
        status: agendamento.status === 'SOLICITADO' ? 'SOLICITADO' : 'AGENDADO',
        agendamentos: [agendamento],
        firstAgendamento: agendamento,
      });
      continue;
    }

    existente.agendamentos.push(agendamento);
    existente.quantidadeAgendamentos += 1;
    existente.precoTotal = existente.precoUnitario * existente.quantidadeAgendamentos;
    if (agendamento.status === 'SOLICITADO') {
      existente.status = 'SOLICITADO';
    }
  }

  const resultado: ReleaseParticularItem[] = [...agrupados.values(), ...individuais];
  resultado.sort((a, b) => {
    const dataA = isGrouped(a) ? a.firstAgendamento.dataHoraInicio : a.dataHoraInicio;
    const dataB = isGrouped(b) ? b.firstAgendamento.dataHoraInicio : b.dataHoraInicio;
    return new Date(dataA).getTime() - new Date(dataB).getTime();
  });

  return resultado;
}

export function ReleaseParticularAppointmentsScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [queryDebounced, setQueryDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [precosParticulares, setPrecosParticulares] = useState<PrecoParticular[]>([]);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const listRef = useRef<FlatList<ReleaseParticularItem> | null>(null);

  const items = useMemo(() => agruparAgendamentos(agendamentos, precosParticulares), [agendamentos, precosParticulares]);

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

        const [agendados, solicitados, precos] = await Promise.all([
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
          getPrecosParticulares(),
        ]);

        setPrecosParticulares(precos);

        const pageItems = [...agendados.data, ...solicitados.data]
          .filter((item) => isParticular(item))
          .sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime());

        setAgendamentos((current) => {
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

  const header = (
    <View className="mb-3 gap-3">
      <PageHeader title="Liberação particulares" subtitle="Libere agendamentos de particulares" />
      <SearchBar placeholder="Buscar paciente ou serviço..." value={query} onChangeText={setQuery} />
      <AppText className="text-xs font-semibold text-content-muted">
        Exibindo {items.length} cards de {total} agendamentos
      </AppText>
      <Button
        variant="secondary"
        size="sm"
        label={refreshing ? 'Atualizando...' : 'Atualizar lista'}
        onPress={() => void fetchPage(1, 'replace', true)}
      />
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
        renderItem={({ item }) => {
          if (isGrouped(item)) {
            const base = item.firstAgendamento;
            return (
              <Pressable
                onPress={() =>
                  router.push(
                routes.releaseParticularActions({
                  agendamentoId: base.id,
                  pacienteId: base.pacienteId,
                  pacienteNome: item.pacienteNome,
                  pacienteWhatsapp: base.paciente?.whatsapp || '',
                  profissionalNome: item.profissionalNome,
                  servicoNome: item.servicoNome,
                  servicoId: item.servicoId,
                  dataHoraInicio: base.dataHoraInicio,
                  status: item.status,
                  recebimento: base.recebimento,
                  dataLiberacao: base.dataCodLiberacao || undefined,
                  quantidade: item.quantidadeAgendamentos,
                  precoUnitario: item.precoUnitario,
                  precoTotal: item.precoTotal,
                  tipoPagamento: item.tipoPagamento,
                  pagamentoAntecipado:
                    precosParticulares.find((p) => p.pacienteId === item.pacienteId && p.servicoId === item.servicoId)
                      ?.pagamentoAntecipado ?? null,
                  diaPagamento:
                    precosParticulares.find((p) => p.pacienteId === item.pacienteId && p.servicoId === item.servicoId)
                      ?.diaPagamento ?? null,
                }),
              )
            }
                className="rounded-2xl border border-surface-border bg-surface-card p-4"
              >
                <View className="mb-2 flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <AppText className="text-base font-semibold text-content-primary">{item.pacienteNome}</AppText>
                    <AppText className="mt-1 text-sm text-content-secondary">{item.servicoNome}</AppText>
                    <AppText className="mt-1 text-xs font-semibold text-brand-700">{item.mesAnoOtimizado} - Mensal</AppText>
                  </View>
                  <Chip label={item.status} tone={item.status === 'SOLICITADO' ? 'warning' : 'info'} />
                </View>

                <AppText className="text-sm text-content-secondary">Mês: {item.mesAnoDisplay}</AppText>
                <AppText className="mt-1 text-sm text-content-secondary">Profissional: {item.profissionalNome}</AppText>

                <View className="mt-2 flex-row gap-2">
                  <View className="flex-1 rounded-xl border border-surface-border bg-surface-background px-3 py-2">
                    <AppText className="text-[11px] font-semibold text-content-muted">Qtd</AppText>
                    <AppText className="text-xs text-content-primary">{item.quantidadeAgendamentos}x</AppText>
                  </View>
                  <View className="flex-1 rounded-xl border border-surface-border bg-surface-background px-3 py-2">
                    <AppText className="text-[11px] font-semibold text-content-muted">Preço total</AppText>
                    <AppText className="text-xs text-content-primary">{formatMoney(item.precoTotal)}</AppText>
                  </View>
                </View>
              </Pressable>
            );
          }

          return (
            (() => {
              const precoInfo = precosParticulares.find((p) => p.pacienteId === item.pacienteId && p.servicoId === item.servicoId);
              return (
            <Pressable
              onPress={() =>
                router.push(
                  routes.releaseParticularActions({
                    agendamentoId: item.id,
                    pacienteId: item.pacienteId,
                    pacienteNome: item.pacienteNome || '',
                    pacienteWhatsapp: item.paciente?.whatsapp || '',
                    profissionalNome: item.profissionalNome || '',
                    servicoNome: item.servicoNome || '',
                    servicoId: item.servicoId,
                    dataHoraInicio: item.dataHoraInicio,
                    status: item.status,
                    recebimento: item.recebimento,
                    dataLiberacao: item.dataCodLiberacao || undefined,
                    quantidade: 1,
                    precoUnitario: precoInfo?.preco,
                    precoTotal: precoInfo?.preco,
                    tipoPagamento: precoInfo?.tipoPagamento || undefined,
                    pagamentoAntecipado: precoInfo?.pagamentoAntecipado ?? null,
                    diaPagamento: precoInfo?.diaPagamento ?? null,
                  }),
                )
              }
              className="rounded-2xl border border-surface-border bg-surface-card p-4"
            >
              <View className="mb-2 flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <AppText className="text-base font-semibold text-content-primary">
                    {item.pacienteNome || 'Paciente não informado'}
                  </AppText>
                  <AppText className="mt-1 text-sm text-content-secondary">
                    {item.servicoNome || 'Serviço não informado'}
                  </AppText>
                </View>
                <Chip label={item.status} tone={item.status === 'SOLICITADO' ? 'warning' : 'info'} />
              </View>

              <AppText className="text-sm text-content-secondary">{formatDateTime(item.dataHoraInicio)}</AppText>
              <AppText className="mt-1 text-sm text-content-secondary">
                Profissional: {item.profissionalNome || 'Não informado'}
              </AppText>
              <View className="mt-2 flex-row gap-2">
                <View className="flex-1 rounded-xl border border-surface-border bg-surface-background px-3 py-2">
                  <AppText className="text-[11px] font-semibold text-content-muted">Qtd</AppText>
                  <AppText className="text-xs text-content-primary">1</AppText>
                </View>
                <View className="flex-1 rounded-xl border border-surface-border bg-surface-background px-3 py-2">
                  <AppText className="text-[11px] font-semibold text-content-muted">Preço</AppText>
                  <AppText className="text-xs text-content-primary">
                    {formatMoney(precoInfo?.preco)}
                  </AppText>
                </View>
              </View>
            </Pressable>
              );
            })()
          );
        }}
      />

      <BackToTopButton
        visible={showBackToTop}
        onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
      />
    </AppScreen>
  );
}
