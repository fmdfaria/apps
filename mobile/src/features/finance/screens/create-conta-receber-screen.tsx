import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBlock } from '@/components/feedback/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import { liberarAgendamentoParticular } from '@/features/agendamentos/services/agendamentos-api';
import { markRecebimentoContaCriada } from '@/features/agendamentos/services/release-particular-recebimento-flow';
import {
  createAgendamentoConta,
  createContaReceber,
  getCategoriasReceita,
  getContasBancariasByEmpresa,
  getConveniosAtivos,
  getEmpresasAtivas,
  getPacientesAtivos,
  receberConta,
  type CategoriaFinanceira,
  type ContaBancariaFinanceiro,
  type ConvenioFinanceiro,
  type EmpresaFinanceiro,
  type FormaRecebimento,
  type PacienteFinanceiro,
  type StatusContaReceber,
} from '@/features/finance/services/finance-api';
import { useToast } from '@/providers/toast-provider';
import { dateBrSlashToIso, isoToDateBrSlash, normalizeDateToIso } from '@/utils/date';

type ContaReceberForm = {
  descricao: string;
  valorOriginal: string;
  formaRecebimento: FormaRecebimento;
  dataEmissao: string;
  dataVencimento: string;
  empresaId: string;
  contaBancariaId: string;
  categoriaId: string;
  convenioId: string;
  pacienteId: string;
  numeroDocumento: string;
  observacoes: string;
};

type DateFieldTarget = 'dataEmissao' | 'dataVencimento';

const FORMA_RECEBIMENTO_OPTIONS: Array<{ label: string; value: FormaRecebimento }> = [
  { label: 'PIX', value: 'PIX' },
  { label: 'Dinheiro', value: 'DINHEIRO' },
  { label: 'Cartao credito', value: 'CARTAO_CREDITO' },
  { label: 'Cartao debito', value: 'CARTAO_DEBITO' },
  { label: 'Transferencia', value: 'TRANSFERENCIA' },
  { label: 'Cheque', value: 'CHEQUE' },
  { label: 'Boleto', value: 'BOLETO' },
];

function parseApiError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (message) return message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function parseBooleanParam(value?: string) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'sim') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'nao' || normalized === 'não') return false;
  return null;
}

function getTodayIso() {
  return new Date().toISOString().split('T')[0];
}

function formatMesAnoFromDate(value?: string) {
  const iso = normalizeDateToIso(value);
  if (!iso) return '';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const month = date.toLocaleDateString('pt-BR', { month: 'long' });
  const monthCapitalized = month.slice(0, 1).toUpperCase() + month.slice(1);
  return `${monthCapitalized} ${date.getFullYear()}`;
}

function normalizeText(value?: string | null) {
  if (!value) return '';
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function includesIgnoreCase(source?: string | null, target?: string | null) {
  if (!source || !target) return false;
  return normalizeText(source).includes(normalizeText(target));
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateToBr(date: Date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function buildMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days: Array<Date | null> = [];
  for (let i = 0; i < startWeekday; i += 1) days.push(null);
  for (let day = 1; day <= totalDays; day += 1) days.push(new Date(year, month, day));
  while (days.length % 7 !== 0) days.push(null);

  return days;
}

export function CreateContaReceberScreen() {
  const params = useLocalSearchParams<{
    agendamentoId: string;
    agendamentoIds?: string;
    pacienteId: string;
    convenioId?: string;
    pacienteNome?: string;
    servicoNome?: string;
    mesAnoDisplay?: string;
    quantidade?: string;
    valorOriginal?: string;
    pagamentoAntecipado?: string;
    dataLiberacao?: string;
    isGrupoMensal?: string;
  }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { permissions, user } = useAuth();
  const insets = useSafeAreaInsets();

  const canCreateContaReceber = useMemo(
    () => hasRoutePermission(permissions, { path: '/contas-receber', method: 'POST' }),
    [permissions],
  );

  const quantidade = useMemo(() => {
    const parsed = Number(params.quantidade || '1');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [params.quantidade]);

  const valorOriginalInicial = useMemo(() => {
    const parsed = Number(params.valorOriginal || '0');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [params.valorOriginal]);

  const isGrupoMensal = useMemo(() => parseBooleanParam(params.isGrupoMensal) === true, [params.isGrupoMensal]);
  const pagamentoAntecipado = useMemo(
    () => parseBooleanParam(params.pagamentoAntecipado) === true,
    [params.pagamentoAntecipado],
  );

  const descricaoInicial = useMemo(() => {
    const pacienteNome = params.pacienteNome || 'Paciente';
    const servicoNome = params.servicoNome || 'Servico';
    const mesAnoDisplay = params.mesAnoDisplay || formatMesAnoFromDate(params.dataLiberacao);

    if (isGrupoMensal) {
      return `Pagamento particular mensal - ${servicoNome} - ${pacienteNome} - ${mesAnoDisplay} (${quantidade}x)`;
    }

    return `Pagamento particular - ${servicoNome} - ${pacienteNome}`;
  }, [isGrupoMensal, params.dataLiberacao, params.mesAnoDisplay, params.pacienteNome, params.servicoNome, quantidade]);

  const observacoesIniciais = useMemo(() => {
    if (isGrupoMensal) {
      return `Gerado automaticamente pela liberacao mensal de ${quantidade} agendamentos particulares`;
    }
    return 'Gerado automaticamente pela liberacao do agendamento particular';
  }, [isGrupoMensal, quantidade]);

  const statusContaReceber: StatusContaReceber = pagamentoAntecipado ? 'RECEBIDO' : 'PENDENTE';
  const statusContaReceberLabel = statusContaReceber === 'RECEBIDO' ? 'Recebido' : 'Pendente';

  const [form, setForm] = useState<ContaReceberForm>({
    descricao: descricaoInicial,
    valorOriginal: valorOriginalInicial ? String(valorOriginalInicial) : '',
    formaRecebimento: 'PIX',
    dataEmissao: isoToDateBrSlash(getTodayIso()),
    dataVencimento: '',
    empresaId: '',
    contaBancariaId: '',
    categoriaId: '',
    convenioId: params.convenioId || '',
    pacienteId: params.pacienteId || '',
    numeroDocumento: '',
    observacoes: observacoesIniciais,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaFinanceiro[]>([]);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancariaFinanceiro[]>([]);
  const [convenios, setConvenios] = useState<ConvenioFinanceiro[]>([]);
  const [pacientes, setPacientes] = useState<PacienteFinanceiro[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTargetField, setCalendarTargetField] = useState<DateFieldTarget>('dataEmissao');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const monthDays = useMemo(() => buildMonthDays(calendarMonth), [calendarMonth]);
  const monthTitle = useMemo(
    () => calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    [calendarMonth],
  );
  const selectedCalendarDate = calendarTargetField === 'dataEmissao' ? form.dataEmissao : form.dataVencimento;

  const openCalendar = useCallback(
    (field: DateFieldTarget) => {
      setCalendarTargetField(field);

      const currentValue = field === 'dataEmissao' ? form.dataEmissao : form.dataVencimento;
      const iso = dateBrSlashToIso(currentValue) || getTodayIso();
      const [year, month] = iso.split('-').map(Number);
      setCalendarMonth(new Date(year, month - 1, 1));
      setCalendarVisible(true);
    },
    [form.dataEmissao, form.dataVencimento],
  );

  const handleSelectCalendarDate = useCallback((day: Date) => {
    const value = formatDateToBr(day);
    setForm((current) => ({ ...current, [calendarTargetField]: value }));
    setCalendarVisible(false);
  }, [calendarTargetField]);

  const loadContasBancarias = useCallback(
    async (empresaId: string, shouldPreselectByName: boolean) => {
      if (!empresaId) {
        setContasBancarias([]);
        setForm((current) => ({ ...current, contaBancariaId: '' }));
        return;
      }

      try {
        const contas = await getContasBancariasByEmpresa(empresaId);
        setContasBancarias(contas);

        if (!contas.length) {
          setForm((current) => ({ ...current, contaBancariaId: '' }));
          return;
        }

        if (shouldPreselectByName) {
          const contaPreferida = contas.find((item) => includesIgnoreCase(item.nome, 'Banco Inter da Celebramente'));
          setForm((current) => ({
            ...current,
            contaBancariaId: contaPreferida?.id || current.contaBancariaId || contas[0]?.id || '',
          }));
          return;
        }

        setForm((current) => ({
          ...current,
          contaBancariaId: contas.some((item) => item.id === current.contaBancariaId)
            ? current.contaBancariaId
            : contas[0]?.id || '',
        }));
      } catch {
        setContasBancarias([]);
      }
    },
    [],
  );

  const loadInitialData = useCallback(async () => {
    if (!canCreateContaReceber) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [empresasData, categoriasData, conveniosData, pacientesData] = await Promise.all([
        getEmpresasAtivas(),
        getCategoriasReceita(),
        getConveniosAtivos(),
        getPacientesAtivos(),
      ]);

      setEmpresas(empresasData);
      setCategorias(categoriasData);
      setConvenios(conveniosData);
      setPacientes(pacientesData);

      const empresaPreferida =
        empresasData.find(
          (item) => includesIgnoreCase(item.nomeFantasia, 'CELEBRAMENTE') || includesIgnoreCase(item.razaoSocial, 'CELEBRAMENTE'),
        ) || empresasData[0];

      const categoriaPreferida =
        categoriasData.find((item) => includesIgnoreCase(item.nome, 'RECEITA SERVICOS')) || categoriasData[0];

      const convenioParticular =
        conveniosData.find((item) => includesIgnoreCase(item.nome, 'Particular')) || conveniosData[0];

      setForm((current) => ({
        ...current,
        empresaId: current.empresaId || empresaPreferida?.id || '',
        categoriaId: current.categoriaId || categoriaPreferida?.id || '',
        convenioId: current.convenioId || convenioParticular?.id || '',
        pacienteId: current.pacienteId || params.pacienteId || '',
      }));

      if (empresaPreferida?.id) {
        await loadContasBancarias(empresaPreferida.id, true);
      }
    } catch (err) {
      setError(parseApiError(err, 'Nao foi possivel carregar os dados financeiros.'));
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  }, [canCreateContaReceber, loadContasBancarias, params.pacienteId]);

  useFocusEffect(
    useCallback(() => {
      if (!loadedOnce) {
        void loadInitialData();
      }
    }, [loadInitialData, loadedOnce]),
  );

  const empresaOptions = useMemo(
    () =>
      empresas.map((item) => ({
        value: item.id,
        label: item.nomeFantasia || item.razaoSocial || 'Empresa sem nome',
      })),
    [empresas],
  );

  const contaBancariaOptions = useMemo(
    () =>
      contasBancarias.map((item) => ({
        value: item.id,
        label: item.banco ? `${item.nome} - ${item.banco}` : item.nome,
      })),
    [contasBancarias],
  );

  const categoriaOptions = useMemo(
    () =>
      categorias.map((item) => ({
        value: item.id,
        label: item.nome,
      })),
    [categorias],
  );

  const convenioOptions = useMemo(
    () =>
      convenios.map((item) => ({
        value: item.id,
        label: item.nome,
      })),
    [convenios],
  );

  const pacienteOptions = useMemo(
    () =>
      pacientes.map((item) => ({
        value: item.id,
        label: item.nomeCompleto,
      })),
    [pacientes],
  );

  const agendamentoIds = useMemo(() => {
    const rawList = (params.agendamentoIds || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (rawList.length > 0) return rawList;
    return params.agendamentoId ? [params.agendamentoId] : [];
  }, [params.agendamentoId, params.agendamentoIds]);

  const handleChange = useCallback(<K extends keyof ContaReceberForm>(field: K, value: ContaReceberForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const handleEmpresaChange = useCallback(
    async (empresaId: string) => {
      setForm((current) => ({ ...current, empresaId, contaBancariaId: '' }));
      await loadContasBancarias(empresaId, false);
    },
    [loadContasBancarias],
  );

  const handleSave = useCallback(async () => {
    if (!canCreateContaReceber) {
      showToast({ message: 'Voce nao tem permissao para criar conta a receber.' });
      return;
    }

    if (!form.descricao.trim()) {
      showToast({ message: 'Informe a descricao da conta.' });
      return;
    }

    const valorOriginal = Number(form.valorOriginal.replace(',', '.'));
    if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
      showToast({ message: 'Informe um valor valido maior que zero.' });
      return;
    }

    if (!form.dataEmissao.trim() || !form.dataVencimento.trim()) {
      showToast({ message: 'Preencha data de emissao e data de vencimento.' });
      return;
    }

    const dataEmissaoIso = dateBrSlashToIso(form.dataEmissao.trim());
    const dataVencimentoIso = dateBrSlashToIso(form.dataVencimento.trim());
    if (!dataEmissaoIso || !dataVencimentoIso) {
      showToast({ message: 'Use o formato DD/MM/AAAA nas datas.' });
      return;
    }

    if (!form.empresaId || !form.categoriaId) {
      showToast({ message: 'Selecione empresa e categoria.' });
      return;
    }

    if (statusContaReceber === 'RECEBIDO' && !form.contaBancariaId) {
      showToast({ message: 'Selecione a conta bancaria para registrar o recebimento.' });
      return;
    }

    if (!agendamentoIds.length) {
      showToast({ message: 'Agendamento nao informado para vincular a conta.' });
      return;
    }

    setSaving(true);
    try {
      const contaCriada = await createContaReceber({
        descricao: form.descricao.trim(),
        valorOriginal,
        dataEmissao: dataEmissaoIso,
        dataVencimento: dataVencimentoIso,
        empresaId: form.empresaId,
        categoriaId: form.categoriaId,
        contaBancariaId: form.contaBancariaId || undefined,
        convenioId: form.convenioId || undefined,
        pacienteId: form.pacienteId || undefined,
        numeroDocumento: form.numeroDocumento.trim() || undefined,
        observacoes: form.observacoes.trim() || undefined,
        status: statusContaReceber,
        formaRecebimento: form.formaRecebimento,
        userCreatedId: user?.id || undefined,
        userUpdatedId: user?.id || undefined,
      });

      for (const agendamentoId of agendamentoIds) {
        try {
          await createAgendamentoConta({
            agendamentoId,
            contaReceberId: contaCriada.id,
          });
        } catch {
          // Nao interrompe o fluxo se algum vinculo falhar.
        }
      }

      if (statusContaReceber === 'RECEBIDO') {
        await receberConta(contaCriada.id, {
          valorRecebido: valorOriginal,
          dataRecebimento: normalizeDateToIso(params.dataLiberacao) || getTodayIso(),
          formaRecebimento: form.formaRecebimento,
          contaBancariaId: form.contaBancariaId,
          observacoes: 'Recebimento automatico pela liberacao de agendamento particular',
        });
      }

      const dataLiberacaoIso = normalizeDateToIso(params.dataLiberacao) || getTodayIso();
      const liberacaoFalhas: string[] = [];

      for (const agendamentoId of agendamentoIds) {
        try {
          await liberarAgendamentoParticular(agendamentoId, {
            recebimento: true,
            dataLiberacao: dataLiberacaoIso,
            pagamentoAntecipado,
          });
        } catch {
          liberacaoFalhas.push(agendamentoId);
        }
      }

      const agendamentoPrincipalLiberado = !liberacaoFalhas.includes(params.agendamentoId);
      markRecebimentoContaCriada(params.agendamentoId, { liberado: agendamentoPrincipalLiberado });

      if (liberacaoFalhas.length > 0) {
        showToast({
          message: `Conta criada, mas ${liberacaoFalhas.length} agendamento(s) não foram liberados automaticamente.`,
        });
      } else {
        showToast({ message: 'Conta a receber criada e atendimento liberado com sucesso.' });
      }
      router.back();
    } catch (err) {
      showToast({ message: parseApiError(err, 'Nao foi possivel criar a conta a receber.') });
    } finally {
      setSaving(false);
    }
  }, [
    agendamentoIds,
    canCreateContaReceber,
    form.categoriaId,
    form.contaBancariaId,
    form.convenioId,
    form.dataEmissao,
    form.dataVencimento,
    form.descricao,
    form.empresaId,
    form.formaRecebimento,
    form.numeroDocumento,
    form.observacoes,
    form.pacienteId,
    form.valorOriginal,
    pagamentoAntecipado,
    params.agendamentoId,
    params.dataLiberacao,
    router,
    statusContaReceber,
    showToast,
    user?.id,
  ]);

  if (!canCreateContaReceber) {
    return (
      <AppScreen>
        <PageHeader title="Criar conta a receber" subtitle="Fluxo de liberacao particular" />
        <View className="mt-3">
          <ErrorState description="Voce nao tem permissao para criar contas a receber." onRetry={() => router.back()} />
        </View>
      </AppScreen>
    );
  }

  if (loading) {
    return (
      <AppScreen>
        <PageHeader title="Criar conta a receber" subtitle="Fluxo de liberacao particular" />
        <View className="mt-3">
          <SkeletonBlock lines={8} />
        </View>
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen>
        <PageHeader title="Criar conta a receber" subtitle="Fluxo de liberacao particular" />
        <View className="mt-3">
          <ErrorState description={error} onRetry={() => void loadInitialData()} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <PageHeader title="Criar conta a receber" subtitle="Dados pre-preenchidos conforme liberacao particular" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingTop: 8, paddingBottom: Math.max(24, insets.bottom + 16) }}
      >
        <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
          <AppText className="text-sm font-semibold text-content-primary">{params.pacienteNome || 'Paciente'}</AppText>
          <AppText className="mt-1 text-xs text-content-secondary">
            {isGrupoMensal ? `${quantidade} agendamentos no mes` : 'Agendamento avulso'}
          </AppText>
          <AppText className="mt-1 text-xs text-content-secondary">
            Valor sugerido: {formatCurrency(Number(form.valorOriginal.replace(',', '.')))}
          </AppText>
        </View>

        <Input label="Descricao *" value={form.descricao} onChangeText={(value) => handleChange('descricao', value)} />
        <Input
          label="Valor *"
          value={form.valorOriginal}
          onChangeText={(value) => handleChange('valorOriginal', value)}
          keyboardType="decimal-pad"
          placeholder="0,00"
        />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Input label="Status *" value={statusContaReceberLabel} editable={false} />
          </View>
          <View className="flex-1">
            <Select
              label="Forma de recebimento *"
              value={form.formaRecebimento}
              onChange={(value) => handleChange('formaRecebimento', value as FormaRecebimento)}
              options={FORMA_RECEBIMENTO_OPTIONS}
            />
          </View>
        </View>

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Pressable onPress={() => openCalendar('dataEmissao')}>
              <View pointerEvents="none">
                <Input label="Data emissao *" value={form.dataEmissao} editable={false} placeholder="DD/MM/AAAA" />
              </View>
            </Pressable>
          </View>
          <View className="flex-1">
            <Pressable onPress={() => openCalendar('dataVencimento')}>
              <View pointerEvents="none">
                <Input label="Data vencimento *" value={form.dataVencimento} editable={false} placeholder="DD/MM/AAAA" />
              </View>
            </Pressable>
          </View>
        </View>

        <Select label="Empresa *" value={form.empresaId} onChange={(value) => void handleEmpresaChange(value)} options={empresaOptions} />
        <Select
          label="Conta bancaria"
          value={form.contaBancariaId}
          onChange={(value) => handleChange('contaBancariaId', value)}
          options={contaBancariaOptions}
        />
        <Select
          label="Categoria *"
          value={form.categoriaId}
          onChange={(value) => handleChange('categoriaId', value)}
          options={categoriaOptions}
        />
        <Select label="Convenio" value={form.convenioId} onChange={(value) => handleChange('convenioId', value)} options={convenioOptions} />
        <Select label="Paciente" value={form.pacienteId} onChange={(value) => handleChange('pacienteId', value)} options={pacienteOptions} />
        <Input label="Numero documento" value={form.numeroDocumento} onChangeText={(value) => handleChange('numeroDocumento', value)} />
        <Input label="Observacoes" value={form.observacoes} onChangeText={(value) => handleChange('observacoes', value)} />

        <View className="mt-2 flex-row gap-2">
          <Button label="Cancelar" variant="secondary" className="flex-1" onPress={() => router.back()} disabled={saving} />
          <Button label="Salvar conta" className="flex-1" onPress={() => void handleSave()} loading={saving} />
        </View>
      </ScrollView>

      <BottomSheet
        visible={calendarVisible}
        title="Selecionar data"
        onClose={() => setCalendarVisible(false)}
        footer={
          <View className="flex-row gap-3">
            <Button label="Fechar" variant="secondary" className="flex-1" onPress={() => setCalendarVisible(false)} />
          </View>
        }
      >
        <View className="pb-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Button
              label="<"
              size="sm"
              variant="secondary"
              onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            />
            <AppText className="text-sm font-semibold text-content-primary">{monthTitle}</AppText>
            <Button
              label=">"
              size="sm"
              variant="secondary"
              onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            />
          </View>

          <View className="mb-2 flex-row">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((week) => (
              <AppText key={week} className="flex-1 text-center text-xs font-semibold text-content-muted">
                {week}
              </AppText>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {monthDays.map((day, index) => {
              if (!day) return <View key={`empty-${index}`} className="mb-1 h-10 w-[14.28%]" />;

              const selected = selectedCalendarDate === formatDateToBr(day);
              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => handleSelectCalendarDate(day)}
                  className={`mb-1 h-10 w-[14.28%] items-center justify-center rounded-lg ${selected ? 'bg-brand-700' : 'bg-slate-100'}`}
                >
                  <AppText className={`text-sm font-semibold ${selected ? 'text-white' : 'text-content-primary'}`}>
                    {day.getDate()}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </BottomSheet>
    </AppScreen>
  );
}
