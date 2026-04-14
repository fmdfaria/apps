import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandedLoadingState } from '@/components/feedback/branded-loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { showConfirmDialog } from '@/components/ui/confirm-dialog';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import {
  OPCOES_HORARIOS,
  validarRecursoConformeDisponibilidade,
  verificarHorariosProfissional,
  type HorarioVerificado,
} from '@/features/agenda/services/appointment-validation';
import {
  createAgendamento,
  getAgendamentoFormData,
  getMeuProfissional,
  getServicosConveniosByProfissional,
} from '@/features/agendamentos/services/agendamentos-api';
import {
  formatarConflitosRecorrenciaParaMensagem,
  verificarConflitosRecorrencia,
} from '@/features/agendamentos/services/agendamento-recorrencia-validation';
import type {
  AgendamentoFormConvenio,
  AgendamentoFormPaciente,
  AgendamentoFormProfissional,
  AgendamentoFormRecurso,
  AgendamentoFormServico,
  CreateAgendamentoPayload,
  DisponibilidadeProfissional,
  RecorrenciaAgendamento,
  TipoAtendimento,
  TipoRecorrencia,
} from '@/features/agendamentos/types';
import { routes } from '@/navigation/routes';
import { useToast } from '@/providers/toast-provider';
import { dateBrSlashToIso, isoToDateBrSlash } from '@/utils/date';

type DateFieldTarget = 'agendamento' | 'recorrenciaAte';

type FormState = {
  pacienteId: string;
  profissionalId: string;
  convenioId: string;
  servicoId: string;
  recursoId: string;
  tipoAtendimento: TipoAtendimento;
};

const RECORRENCIA_OPTIONS: Array<{ label: string; value: TipoRecorrencia }> = [
  { label: 'Semanal', value: 'semanal' },
  { label: 'Quinzenal', value: 'quinzenal' },
  { label: 'Mensal', value: 'mensal' },
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

function getTodayBr() {
  return isoToDateBrSlash(new Date().toISOString());
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

function parseMinutes(value: unknown) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.getHours() * 60 + value.getMinutes();
  }

  if (typeof value === 'string') {
    if (value.includes('T')) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date.getHours() * 60 + date.getMinutes();
    }

    if (value.includes(':')) {
      const [h, m] = value.split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    }
  }

  return null;
}

function toYmd(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeYmd(value: unknown): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    return toYmd(value);
  }

  if (typeof value === 'string') {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
    if (match) return match[1];

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return toYmd(parsed);
  }

  return null;
}

function buildIsoWithLocalOffset(dataIso: string, hora: string) {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${dataIso}T${hora}:00${sign}${hh}:${mm}`;
}

function isProfissionalRole(roles?: string[]) {
  const normalized = (roles || []).map((role) => String(role || '').toUpperCase());
  return normalized.some((role) => role === 'PROFISSIONAL' || role.includes('PROFISSIONAL'));
}

function autoSelecionarRecurso(params: {
  profissionalId: string;
  dataIso: string;
  hora: string;
  disponibilidades: DisponibilidadeProfissional[];
  recursos: AgendamentoFormRecurso[];
}) {
  const { profissionalId, dataIso, hora, disponibilidades, recursos } = params;
  const dataRef = new Date(`${dataIso}T00:00:00`);
  if (Number.isNaN(dataRef.getTime())) return null;
  const diaSemana = dataRef.getDay();
  const horarioMinutos = parseMinutes(hora);
  if (horarioMinutos === null) return null;

  const doProfissional = disponibilidades.filter((disp) => {
    const profId = disp.profissionalId ?? disp.profissional_id;
    return profId === profissionalId;
  });

  const especificas = doProfissional.filter((disp) => {
    const ymd = normalizeYmd(disp.dataEspecifica ?? disp.data_especifica);
    return ymd === dataIso;
  });

  const candidatasBase =
    especificas.length > 0
      ? especificas
      : doProfissional.filter((disp) => {
          const ymd = normalizeYmd(disp.dataEspecifica ?? disp.data_especifica);
          if (ymd) return false;
          const diaRaw = disp.diaSemana ?? disp.dia_semana;
          const dia = typeof diaRaw === 'string' ? Number(diaRaw) : diaRaw;
          return dia === diaSemana;
        });

  const candidatas = candidatasBase.filter((disp) => {
    const inicio = parseMinutes(disp.horaInicio ?? disp.hora_inicio);
    const fim = parseMinutes(disp.horaFim ?? disp.hora_fim);
    if (inicio === null || fim === null) return false;
    if (!(horarioMinutos >= inicio && horarioMinutos < fim)) return false;
    return Boolean(disp.recursoId ?? disp.recurso_id);
  });

  if (!candidatas.length) return null;

  const mapped = candidatas
    .map((disp) => {
      const recursoId = (disp.recursoId ?? disp.recurso_id) as string;
      const recurso = recursos.find((item) => item.id === recursoId);
      if (!recurso) return null;
      return {
        recursoId,
        tipo: (disp.tipo || '').toLowerCase(),
      };
    })
    .filter((item): item is { recursoId: string; tipo: string } => Boolean(item));

  if (!mapped.length) return null;
  if (mapped.length === 1) return mapped[0].recursoId;

  const presencial = mapped.find((item) => item.tipo === 'presencial' || item.tipo === 'disponivel');
  if (presencial) return presencial.recursoId;

  return mapped[0].recursoId;
}

function formatPacienteConflitoMessage(raw: string) {
  return raw.replace(/^Conflito de paciente:\s*/i, '').trim();
}

function currentTipoAtendimento(form: FormState): TipoAtendimento {
  return form.tipoAtendimento || 'presencial';
}

export function CreateAgendamentoScreen() {
  const router = useRouter();
  const { permissions, user } = useAuth();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const canCreate = useMemo(
    () =>
      hasRoutePermission(permissions, {
        path: '/agendamentos',
        method: 'POST',
      }),
    [permissions],
  );
  const profissionalOnly = useMemo(() => isProfissionalRole(user?.roles), [user?.roles]);

  const [form, setForm] = useState<FormState>({
    pacienteId: '',
    profissionalId: '',
    convenioId: '',
    servicoId: '',
    recursoId: '',
    tipoAtendimento: 'presencial',
  });
  const [dataAgendamento, setDataAgendamento] = useState(getTodayBr());
  const [horaAgendamento, setHoraAgendamento] = useState('');
  const [temRecorrencia, setTemRecorrencia] = useState(true);
  const [recorrenciaTipo, setRecorrenciaTipo] = useState<TipoRecorrencia>('semanal');
  const [recorrenciaRepeticoes, setRecorrenciaRepeticoes] = useState('50');
  const [recorrenciaAte, setRecorrenciaAte] = useState('');

  const [pacientes, setPacientes] = useState<AgendamentoFormPaciente[]>([]);
  const [profissionais, setProfissionais] = useState<AgendamentoFormProfissional[]>([]);
  const [convenios, setConvenios] = useState<AgendamentoFormConvenio[]>([]);
  const [servicos, setServicos] = useState<AgendamentoFormServico[]>([]);
  const [recursos, setRecursos] = useState<AgendamentoFormRecurso[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<DisponibilidadeProfissional[]>([]);
  const [conveniosProfissional, setConveniosProfissional] = useState<AgendamentoFormConvenio[]>([]);
  const [servicosProfissional, setServicosProfissional] = useState<AgendamentoFormServico[]>([]);
  const [horariosVerificados, setHorariosVerificados] = useState<HorarioVerificado[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<DateFieldTarget>('agendamento');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [hourPickerVisible, setHourPickerVisible] = useState(false);
  const [manualResourceSelection, setManualResourceSelection] = useState(false);

  const monthDays = useMemo(() => buildMonthDays(calendarMonth), [calendarMonth]);
  const monthTitle = useMemo(
    () => calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    [calendarMonth],
  );
  const selectedCalendarDate = calendarTarget === 'agendamento' ? dataAgendamento : recorrenciaAte;

  const dataAgendamentoIso = useMemo(() => dateBrSlashToIso(dataAgendamento), [dataAgendamento]);

  const horariosDisponiveis = useMemo(
    () => horariosVerificados.filter((item) => item.verificacao.status === 'disponivel'),
    [horariosVerificados],
  );

  const conveniosDisponiveis = useMemo(() => {
    if (form.profissionalId && conveniosProfissional.length) {
      return conveniosProfissional;
    }
    return convenios;
  }, [convenios, conveniosProfissional, form.profissionalId]);

  const servicosDisponiveis = useMemo(() => {
    const base = form.profissionalId && servicosProfissional.length ? servicosProfissional : servicos;
    if (!form.convenioId) return [];
    return base.filter((item) => item.convenioId === form.convenioId);
  }, [form.convenioId, form.profissionalId, servicos, servicosProfissional]);

  const pacienteOptions = useMemo(
    () =>
      pacientes.map((item) => ({
        value: item.id,
        label: item.whatsapp ? `${item.nomeCompleto} - ${item.whatsapp}` : item.nomeCompleto,
      })),
    [pacientes],
  );

  const profissionalOptions = useMemo(
    () =>
      profissionais.map((item) => ({
        value: item.id,
        label: item.nome,
      })),
    [profissionais],
  );

  const convenioOptions = useMemo(
    () =>
      conveniosDisponiveis.map((item) => ({
        value: item.id,
        label: item.nome,
      })),
    [conveniosDisponiveis],
  );

  const servicoOptions = useMemo(
    () =>
      servicosDisponiveis.map((item) => ({
        value: item.id,
        label: item.duracaoMinutos ? `${item.nome} - ${item.duracaoMinutos} min` : item.nome,
      })),
    [servicosDisponiveis],
  );

  const recursoOptions = useMemo(
    () =>
      recursos.map((item) => ({
        value: item.id,
        label: item.nome,
      })),
    [recursos],
  );

  const tipoAtendimentoOptions = useMemo(
    () => [
      { value: 'presencial', label: 'Presencial' },
      { value: 'online', label: 'Online' },
    ],
    [],
  );

  const horaOptions = useMemo(() => {
    return OPCOES_HORARIOS.map((hora) => {
      const info = horariosVerificados.find((item) => item.horario === hora);
      if (!info) {
        return { hora, disabled: false, motivo: '' };
      }

      const disabled = info.verificacao.status !== 'disponivel';
      return {
        hora,
        disabled,
        motivo: disabled ? info.verificacao.motivo || 'Indisponivel' : '',
      };
    });
  }, [horariosVerificados]);

  const openCalendar = useCallback(
    (target: DateFieldTarget) => {
      setCalendarTarget(target);

      const value = target === 'agendamento' ? dataAgendamento : recorrenciaAte;
      const iso = dateBrSlashToIso(value) || new Date().toISOString().split('T')[0];
      const [year, month] = iso.split('-').map(Number);
      setCalendarMonth(new Date(year, month - 1, 1));
      setCalendarVisible(true);
    },
    [dataAgendamento, recorrenciaAte],
  );

  const handleCalendarSelect = useCallback(
    (date: Date) => {
      const value = formatDateToBr(date);
      if (calendarTarget === 'agendamento') {
        setDataAgendamento(value);
      } else {
        setRecorrenciaAte(value);
      }
      setCalendarVisible(false);
    },
    [calendarTarget],
  );

  const loadInitialData = useCallback(async () => {
    if (!canCreate) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getAgendamentoFormData();
      let profissionaisDisponiveis = data.profissionais;

      if (profissionalOnly) {
        const me = await getMeuProfissional();
        profissionaisDisponiveis = data.profissionais.filter((item) => item.id === me.id);
        setForm((current) => ({
          ...current,
          profissionalId: me.id,
        }));
      }

      setPacientes(data.pacientes.filter((item) => item.ativo !== false));
      setProfissionais(profissionaisDisponiveis.filter((item) => item.ativo !== false));
      setConvenios(data.convenios.filter((item) => item.ativo !== false));
      setServicos(data.servicos.filter((item) => item.ativo !== false));
      setRecursos(data.recursos.filter((item) => item.ativo !== false));
      setDisponibilidades(data.disponibilidades || []);
    } catch (err) {
      setError(parseApiError(err, 'Nao foi possivel carregar os dados de agendamento.'));
    } finally {
      setLoading(false);
    }
  }, [canCreate, profissionalOnly]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    const run = async () => {
      if (!form.profissionalId) {
        setConveniosProfissional([]);
        setServicosProfissional([]);
        return;
      }

      try {
        const data = await getServicosConveniosByProfissional(form.profissionalId);

        const conveniosMapped = [...data.convenios].sort((a, b) =>
          a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
        );

        const servicosMapped = data.servicos
          .map((item) => ({
            id: item.id,
            nome: item.nome,
            duracaoMinutos: item.duracaoMinutos,
            convenioId: item.convenio.id,
          }))
          .filter((item, index, all) => index === all.findIndex((inner) => inner.id === item.id))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

        setConveniosProfissional(conveniosMapped);
        setServicosProfissional(servicosMapped);
      } catch {
        setConveniosProfissional([]);
        setServicosProfissional([]);
      }
    };

    void run();
  }, [form.profissionalId]);

  useEffect(() => {
    if (!form.profissionalId || !dataAgendamentoIso) {
      setHorariosVerificados([]);
      return;
    }

    let mounted = true;
    const run = async () => {
      setLoadingHorarios(true);
      try {
        const [year, month, day] = dataAgendamentoIso.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const horarios = await verificarHorariosProfissional(form.profissionalId, date);
        if (mounted) setHorariosVerificados(horarios);
      } catch {
        if (mounted) setHorariosVerificados([]);
      } finally {
        if (mounted) setLoadingHorarios(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [dataAgendamentoIso, form.profissionalId]);

  useEffect(() => {
    if (!form.profissionalId || !dataAgendamentoIso || !horaAgendamento) return;
    if (manualResourceSelection && form.recursoId) return;

    const recursoId = autoSelecionarRecurso({
      profissionalId: form.profissionalId,
      dataIso: dataAgendamentoIso,
      hora: horaAgendamento,
      disponibilidades,
      recursos,
    });

    if (!recursoId) {
      if (form.recursoId) {
        setForm((current) => ({
          ...current,
          recursoId: '',
          tipoAtendimento: 'presencial',
        }));
      }
      return;
    }

    if (recursoId !== form.recursoId) {
      const recurso = recursos.find((item) => item.id === recursoId);
      const tipoAtendimento = recurso?.nome.toLowerCase().includes('online') ? 'online' : currentTipoAtendimento(form);
      setForm((current) => ({
        ...current,
        recursoId,
        tipoAtendimento,
      }));
    }
  }, [dataAgendamentoIso, disponibilidades, form, horaAgendamento, manualResourceSelection, recursos]);

  const handlePacienteChange = useCallback(
    (pacienteId: string) => {
      const paciente = pacientes.find((item) => item.id === pacienteId);
      let convenioId = paciente?.convenioId || '';

      if (convenioId && !conveniosDisponiveis.some((item) => item.id === convenioId)) {
        convenioId = '';
      }

      setForm((current) => ({
        ...current,
        pacienteId,
        convenioId,
        servicoId: '',
      }));
      setManualResourceSelection(false);
    },
    [conveniosDisponiveis, pacientes],
  );

  const handleProfissionalChange = useCallback((profissionalId: string) => {
    setForm((current) => ({
      ...current,
      profissionalId,
      convenioId: '',
      servicoId: '',
      recursoId: '',
      tipoAtendimento: 'presencial',
    }));
    setHoraAgendamento('');
    setManualResourceSelection(false);
  }, []);

  const handleConvenioChange = useCallback(
    (convenioId: string) => {
      setForm((current) => {
        const paciente = pacientes.find((item) => item.id === current.pacienteId);
        const manterPaciente = paciente?.convenioId === convenioId;

        return {
          ...current,
          convenioId,
          pacienteId: manterPaciente ? current.pacienteId : '',
          servicoId: '',
          recursoId: '',
          tipoAtendimento: 'presencial',
        };
      });
      setManualResourceSelection(false);
    },
    [pacientes],
  );

  const handleServicoChange = useCallback((servicoId: string) => {
    setForm((current) => ({
      ...current,
      servicoId,
      recursoId: '',
      tipoAtendimento: 'presencial',
    }));
    setManualResourceSelection(false);
  }, []);

  const handleRecursoChange = useCallback(
    (recursoId: string) => {
      setManualResourceSelection(true);
      setForm((current) => {
        const recurso = recursos.find((item) => item.id === recursoId);
        if (!recursoId) {
          return {
            ...current,
            recursoId: '',
            tipoAtendimento: 'presencial',
          };
        }

        if (recurso?.nome.toLowerCase().includes('online')) {
          return {
            ...current,
            recursoId,
            tipoAtendimento: 'online',
          };
        }

        return {
          ...current,
          recursoId,
        };
      });
    },
    [recursos],
  );

  const handleHoraPress = useCallback(
    (hora: string, disabled: boolean, motivo: string) => {
      if (disabled) {
        showToast({ message: motivo || 'Horario indisponivel para este profissional.' });
        return;
      }

      setHoraAgendamento(hora);
      setHourPickerVisible(false);
      setManualResourceSelection(false);
    },
    [showToast],
  );

  const validateBeforeCreate = useCallback(async () => {
    if (!canCreate) {
      showToast({ message: 'Voce nao tem permissao para criar agendamento.' });
      return null;
    }

    if (!form.pacienteId || !form.profissionalId || !form.convenioId || !form.servicoId || !form.recursoId) {
      showToast({ message: 'Preencha todos os campos obrigatorios.' });
      return null;
    }

    if (!dataAgendamentoIso || !horaAgendamento) {
      showToast({ message: 'Selecione data e hora do agendamento.' });
      return null;
    }

    if (horariosVerificados.length > 0) {
      const horario = horariosVerificados.find((item) => item.horario === horaAgendamento);
      if (!horario || horario.verificacao.status !== 'disponivel') {
        showToast({ message: horario?.verificacao.motivo || 'Horario indisponivel para o profissional.' });
        return null;
      }
    }

    const recorrencia: RecorrenciaAgendamento | undefined = temRecorrencia
      ? {
          tipo: recorrenciaTipo,
          repeticoes: (() => {
            const value = Number(recorrenciaRepeticoes);
            if (!Number.isFinite(value) || value < 1) return 50;
            return Math.floor(value);
          })(),
          ...(recorrenciaAte
            ? (() => {
                const ateIso = dateBrSlashToIso(recorrenciaAte);
                if (!ateIso) return {};
                return { ate: ateIso };
              })()
            : {}),
        }
      : undefined;

    if (temRecorrencia && recorrenciaAte && !dateBrSlashToIso(recorrenciaAte)) {
      showToast({ message: 'Data limite da recorrencia invalida. Use DD/MM/AAAA.' });
      return null;
    }

    const validacaoRecurso = await validarRecursoConformeDisponibilidade({
      profissionalId: form.profissionalId,
      recursoId: form.recursoId,
      dataHora: `${dataAgendamentoIso}T${horaAgendamento}`,
    });

    if (!validacaoRecurso.valido) {
      const confirm = await showConfirmDialog({
        title: 'Recurso inconsistente',
        message: `${validacaoRecurso.mensagem}\n\nDeseja continuar mesmo assim?`,
        confirmText: 'Continuar',
        cancelText: 'Cancelar',
      });

      if (!confirm) {
        return null;
      }
    }

    if (recorrencia) {
      const conflitos = await verificarConflitosRecorrencia({
        profissionalId: form.profissionalId,
        recursoId: form.recursoId,
        dataHoraInicio: `${dataAgendamentoIso}T${horaAgendamento}:00`,
        recorrencia,
      });

      if (conflitos.totalConflitos > 0) {
        Alert.alert(
          'Conflitos de disponibilidade',
          `Foram encontrados ${conflitos.totalConflitos} conflito(s) em ${conflitos.totalDatas} agendamento(s).\n\n${formatarConflitosRecorrenciaParaMensagem(conflitos)}`,
        );
        return null;
      }
    }

    const payload: CreateAgendamentoPayload = {
      pacienteId: form.pacienteId,
      profissionalId: form.profissionalId,
      tipoAtendimento: form.tipoAtendimento,
      recursoId: form.recursoId,
      convenioId: form.convenioId,
      servicoId: form.servicoId,
      dataHoraInicio: buildIsoWithLocalOffset(dataAgendamentoIso, horaAgendamento),
      ...(recorrencia ? { recorrencia } : {}),
    };

    return payload;
  }, [
    canCreate,
    dataAgendamentoIso,
    form,
    horaAgendamento,
    horariosVerificados,
    recorrenciaAte,
    recorrenciaRepeticoes,
    recorrenciaTipo,
    showToast,
    temRecorrencia,
  ]);

  const handleCreate = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    let payload: CreateAgendamentoPayload | null = null;
    try {
      payload = await validateBeforeCreate();
      if (!payload) return;

      await createAgendamento(payload);
      showToast({ message: 'Agendamento criado com sucesso.' });
      router.replace(routes.tabsAgendamentos);
    } catch (err) {
      const backendMessage =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : '';

      const isConflitoPaciente = typeof backendMessage === 'string' && backendMessage.startsWith('Conflito de paciente:');

      if (isConflitoPaciente) {
        const message = formatPacienteConflitoMessage(backendMessage);
        const confirm = await showConfirmDialog({
          title: 'Conflito de paciente',
          message: `${message}\n\nDeseja criar o agendamento mesmo assim?`,
          confirmText: 'Sim',
          cancelText: 'Nao',
        });

        if (confirm) {
          if (!payload) {
            showToast({ message: 'Nao foi possivel criar o agendamento.' });
            return;
          }

          try {
            await createAgendamento({
              ...payload,
              permitirConflitoPaciente: true,
            });
            showToast({ message: 'Agendamento criado com sucesso.' });
            router.replace(routes.tabsAgendamentos);
            return;
          } catch (retryErr) {
            showToast({ message: parseApiError(retryErr, 'Nao foi possivel criar o agendamento.') });
            return;
          }
        }

        return;
      }

      showToast({ message: parseApiError(err, 'Nao foi possivel criar o agendamento.') });
    } finally {
      setSaving(false);
    }
  }, [router, saving, showToast, validateBeforeCreate]);

  if (!canCreate) {
    return (
      <AppScreen>
        <PageHeader title="Novo agendamento" subtitle="Fluxo de criacao" />
        <View className="mt-3">
          <ErrorState description="Voce nao tem permissao para criar agendamentos." onRetry={() => router.back()} />
        </View>
      </AppScreen>
    );
  }

  if (loading) {
    return <BrandedLoadingState subtitle="Carregando dados do novo agendamento..." />;
  }

  if (error) {
    return (
      <AppScreen>
        <PageHeader title="Novo agendamento" subtitle="Fluxo de criacao" />
        <View className="mt-3">
          <ErrorState description={error} onRetry={() => void loadInitialData()} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <PageHeader title="Novo agendamento" subtitle="Preencher os dados para efetuar um novo agendamento." />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingBottom: Math.max(24, insets.bottom + 16) }}
      >
        <Select
          label="Profissional *"
          value={form.profissionalId}
          onChange={handleProfissionalChange}
          options={profissionalOptions}
          placeholder="Selecione"
        />

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Pressable onPress={() => openCalendar('agendamento')}>
              <View pointerEvents="none">
                <Input label="Data *" value={dataAgendamento} editable={false} placeholder="DD/MM/AAAA" />
              </View>
            </Pressable>
          </View>
          <View className="flex-1">
            <Pressable onPress={() => setHourPickerVisible(true)}>
              <View pointerEvents="none">
                <Input label="Hora *" value={horaAgendamento} editable={false} placeholder="Toque para selecionar" />
              </View>
            </Pressable>
          </View>
        </View>

        <AppText className="text-xs text-content-secondary">
          {loadingHorarios
            ? 'Verificando horarios do profissional...'
            : horariosDisponiveis.length
              ? `${horariosDisponiveis.length} horarios disponiveis para a data selecionada`
              : 'Nenhum horario disponivel para esta data'}
        </AppText>

        <Select
          label="Paciente *"
          value={form.pacienteId}
          onChange={handlePacienteChange}
          options={pacienteOptions}
          placeholder="Digite para buscar"
          searchable
          searchPlaceholder="Digite nome ou WhatsApp"
          searchMinLength={1}
        />

        <Select
          label="Convenio *"
          value={form.convenioId}
          onChange={handleConvenioChange}
          options={convenioOptions}
          placeholder={form.pacienteId ? 'Selecione' : 'Selecione paciente primeiro'}
        />

        <Select
          label="Servico *"
          value={form.servicoId}
          onChange={handleServicoChange}
          options={servicoOptions}
          placeholder={form.convenioId ? 'Selecione' : 'Selecione convenio primeiro'}
        />

        <Select
          label="Recurso *"
          value={form.recursoId}
          onChange={handleRecursoChange}
          options={recursoOptions}
          placeholder={form.profissionalId ? 'Selecione' : 'Selecione profissional primeiro'}
        />

        <Select
          label="Tipo de atendimento *"
          value={form.tipoAtendimento}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              tipoAtendimento: (value as TipoAtendimento) || 'presencial',
            }))
          }
          options={tipoAtendimentoOptions}
          placeholder="Selecione"
        />

        <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
          <Pressable
            onPress={() => setTemRecorrencia((current) => !current)}
            className="flex-row items-center gap-3"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: temRecorrencia }}
          >
            <View
              className={
                temRecorrencia
                  ? 'h-5 w-5 items-center justify-center rounded border border-brand-700 bg-brand-700'
                  : 'h-5 w-5 items-center justify-center rounded border border-surface-border bg-white'
              }
            >
              {temRecorrencia ? <AppText className="text-[11px] font-bold text-white">X</AppText> : null}
            </View>
            <AppText className="text-sm font-semibold text-content-primary">Criar recorrencia</AppText>
          </Pressable>

          {temRecorrencia ? (
            <View className="mt-3 gap-3">
              <Select
                label="Tipo de recorrencia"
                value={recorrenciaTipo}
                onChange={(value) => setRecorrenciaTipo((value as TipoRecorrencia) || 'semanal')}
                options={RECORRENCIA_OPTIONS}
              />
              <Input
                label="Repeticoes"
                value={recorrenciaRepeticoes}
                onChangeText={setRecorrenciaRepeticoes}
                keyboardType="number-pad"
                placeholder="Ex: 50"
              />
              <Pressable onPress={() => openCalendar('recorrenciaAte')}>
                <View pointerEvents="none">
                  <Input label="Ou ate a data" value={recorrenciaAte} editable={false} placeholder="DD/MM/AAAA" />
                </View>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View className="mt-2 flex-row gap-2">
          <Button label="Cancelar" variant="secondary" className="flex-1" onPress={() => router.back()} disabled={saving} />
          <Button
            label={saving ? 'Criando...' : 'Criar agendamento'}
            className="flex-1"
            onPress={() => void handleCreate()}
            disabled={saving}
            leftSlot={saving ? <ActivityIndicator color="#FFFFFF" /> : undefined}
          />
        </View>
      </ScrollView>

      <BottomSheet
        visible={hourPickerVisible}
        title="Selecionar horario"
        onClose={() => setHourPickerVisible(false)}
        footer={
          <View className="flex-row gap-3">
            <Button label="Fechar" variant="secondary" className="flex-1" onPress={() => setHourPickerVisible(false)} />
          </View>
        }
      >
        <View className="pb-4">
          {horaOptions.length ? (
            <View className="flex-row flex-wrap gap-2">
              {horaOptions.map((item) => {
                const selected = horaAgendamento === item.hora;
                return (
                  <Pressable
                    key={item.hora}
                    onPress={() => handleHoraPress(item.hora, item.disabled, item.motivo)}
                    className={`rounded-full border px-3 py-2 ${
                      selected
                        ? 'border-green-700 bg-green-700'
                        : item.disabled
                          ? 'border-slate-300 bg-slate-100'
                          : 'border-green-300 bg-green-100'
                    }`}
                  >
                    <AppText
                      className={`text-xs font-semibold ${
                        selected ? 'text-white' : item.disabled ? 'text-content-muted' : 'text-green-800'
                      }`}
                    >
                      {item.hora}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <AppText className="text-sm text-content-secondary">Nao ha horarios disponiveis para o contexto atual.</AppText>
          )}
        </View>
      </BottomSheet>

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
                  onPress={() => handleCalendarSelect(day)}
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
