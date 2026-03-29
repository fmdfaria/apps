import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBlock } from '@/components/feedback/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { useAuth } from '@/features/auth/context/auth-context';
import { getMyProfessional, getProfessionalAppointments } from '@/features/agenda/services/my-agenda-api';
import type { AppointmentStatus, ProfessionalAgendaAppointment } from '@/features/agenda/types';
import { routes } from '@/navigation/routes';
import type { StatusTone } from '@/types/status';

type WeekDay = {
  date: Date;
  key: string;
  label: string;
};

const statusFilters: Array<{ id: 'TODOS' | AppointmentStatus; label: string; tone: StatusTone }> = [
  { id: 'TODOS', label: 'Todos', tone: 'neutral' },
  { id: 'AGENDADO', label: 'Agendado', tone: 'info' },
  { id: 'LIBERADO', label: 'Liberado', tone: 'success' },
  { id: 'ATENDIDO', label: 'Atendido', tone: 'warning' },
  { id: 'PENDENTE', label: 'Pendente', tone: 'danger' },
  { id: 'FINALIZADO', label: 'Finalizado', tone: 'success' },
  { id: 'CANCELADO', label: 'Cancelado', tone: 'danger' },
];

function getMonday(date: Date) {
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);
  const day = base.getDay();
  const diff = base.getDate() - day + (day === 0 ? -6 : 1);
  base.setDate(diff);
  return base;
}

function getWeekDays(weekDate: Date): WeekDay[] {
  const monday = getMonday(weekDate);

  return Array.from({ length: 7 }).map((_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);

    return {
      date: day,
      key: day.toISOString().split('T')[0],
      label: day.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
    };
  });
}

function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function parseApiError(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Não foi possível carregar a agenda.';
}

function normalizeStatus(status: string | undefined | null): AppointmentStatus | 'DESCONHECIDO' {
  const value = (status || '').toUpperCase().trim();
  const valid: AppointmentStatus[] = [
    'AGENDADO',
    'SOLICITADO',
    'LIBERADO',
    'ATENDIDO',
    'FINALIZADO',
    'CANCELADO',
    'ARQUIVADO',
    'PENDENTE',
  ];
  return valid.includes(value as AppointmentStatus) ? (value as AppointmentStatus) : 'DESCONHECIDO';
}

function getStatusBadge(status: string | undefined | null): { label: string; tone: StatusTone } {
  const normalized = normalizeStatus(status);

  if (normalized === 'DESCONHECIDO') return { label: 'Status desconhecido', tone: 'neutral' };

  switch (normalized) {
    case 'AGENDADO':
      return { label: 'Agendado', tone: 'info' };
    case 'SOLICITADO':
      return { label: 'Solicitado', tone: 'warning' };
    case 'LIBERADO':
      return { label: 'Liberado', tone: 'success' };
    case 'ATENDIDO':
      return { label: 'Atendido', tone: 'warning' };
    case 'PENDENTE':
      return { label: 'Pendente', tone: 'danger' };
    case 'FINALIZADO':
      return { label: 'Finalizado', tone: 'success' };
    case 'CANCELADO':
      return { label: 'Cancelado', tone: 'danger' };
    case 'ARQUIVADO':
      return { label: 'Arquivado', tone: 'neutral' };
    default:
      return { label: normalized, tone: 'neutral' };
  }
}

function formatHourRange(appointment: ProfessionalAgendaAppointment) {
  const start = new Date(appointment.dataHoraInicio);
  const end = appointment.dataHoraFim ? new Date(appointment.dataHoraFim) : null;
  const startText = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (!end) return startText;
  const endText = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${startText} - ${endText}`;
}

export function AgendaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [weekDate, setWeekDate] = useState(new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string>(formatDateKey(new Date()));
  const [statusFilter, setStatusFilter] = useState<'TODOS' | AppointmentStatus>('TODOS');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [appointments, setAppointments] = useState<ProfessionalAgendaAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [professionalName, setProfessionalName] = useState<string>('');

  const weekDays = useMemo(() => getWeekDays(weekDate), [weekDate]);

  useEffect(() => {
    const firstDay = weekDays[0]?.key;
    const hasSelectedInsideWeek = weekDays.some((day) => day.key === selectedDayKey);
    if (!hasSelectedInsideWeek && firstDay) setSelectedDayKey(firstDay);
  }, [selectedDayKey, weekDays]);

  const loadAgenda = useCallback(async () => {
    if (!user?.profissionalId) {
      setLoading(false);
      setError('Usuário não vinculado a profissional. Esta página é exclusiva para profissionais.');
      return;
    }

    const first = weekDays[0];
    const last = weekDays[weekDays.length - 1];
    if (!first || !last) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getProfessionalAppointments({
        profissionalId: user.profissionalId,
        dataInicio: startOfDay(first.date).toISOString(),
        dataFim: endOfDay(last.date).toISOString(),
      });
      setAppointments(response.data);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [user?.profissionalId, weekDays]);

  useEffect(() => {
    void loadAgenda();
  }, [loadAgenda]);

  useFocusEffect(
    useCallback(() => {
      void loadAgenda();
    }, [loadAgenda]),
  );

  useEffect(() => {
    const loadProfessionalName = async () => {
      if (!user?.profissionalId) {
        setProfessionalName('');
        return;
      }
      try {
        const professional = await getMyProfessional();
        setProfessionalName(professional.nome || '');
      } catch {
        setProfessionalName('');
      }
    };
    void loadProfessionalName();
  }, [user?.profissionalId]);

  const visibleAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => {
        const dayKey = formatDateKey(new Date(appointment.dataHoraInicio));
        const normalizedStatus = normalizeStatus(appointment.status);
        const statusOk = statusFilter === 'TODOS' ? true : normalizedStatus === statusFilter;
        return dayKey === selectedDayKey && statusOk;
      })
      .sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime());
  }, [appointments, selectedDayKey, statusFilter]);

  const selectedDayLabel = useMemo(() => {
    const selected = weekDays.find((day) => day.key === selectedDayKey);
    return selected ? selected.label : '';
  }, [selectedDayKey, weekDays]);

  const goToPreviousWeek = () => {
    const next = new Date(weekDate);
    next.setDate(weekDate.getDate() - 7);
    setWeekDate(next);
  };

  const goToNextWeek = () => {
    const next = new Date(weekDate);
    next.setDate(weekDate.getDate() + 7);
    setWeekDate(next);
  };

  const goToCurrentWeek = () => {
    setWeekDate(new Date());
    setSelectedDayKey(formatDateKey(new Date()));
  };

  if (!user?.profissionalId) {
    return (
      <AppScreen>
        <PageHeader title="Minha Agenda" subtitle="Agenda exclusiva para profissionais" />
        <ErrorState
          title="Acesso restrito"
          description="Seu usuário não está vinculado a um profissional. Procure o administrador para liberar o acesso."
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <PageHeader title="Minha Agenda" subtitle={`Profissional: ${professionalName || user.nome}`} />

      <View className="mb-4 rounded-2xl border border-surface-border bg-surface-card p-3">
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
          <>
            <View className="mb-3 flex-row items-center gap-2">
              <Button label="Semana -" size="sm" variant="secondary" onPress={goToPreviousWeek} />
              <Button label="Hoje" size="sm" variant="primary" onPress={goToCurrentWeek} />
              <Button label="Semana +" size="sm" variant="secondary" onPress={goToNextWeek} />
            </View>

            <AppText className="mb-2 text-xs font-semibold text-content-muted">Dias da semana</AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
              contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: 2 }}
            >
              {weekDays.map((day) => (
                <Chip
                  key={day.key}
                  label={day.label}
                  tone={day.key === selectedDayKey ? 'info' : 'neutral'}
                  selected={day.key === selectedDayKey}
                  onPress={() => setSelectedDayKey(day.key)}
                />
              ))}
            </ScrollView>

            <AppText className="mb-2 text-xs font-semibold text-content-muted">Status</AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: 2 }}
            >
              {statusFilters.map((status) => (
                <Chip
                  key={status.id}
                  label={status.label}
                  tone={status.tone}
                  selected={statusFilter === status.id}
                  onPress={() => setStatusFilter(status.id)}
                />
              ))}
            </ScrollView>
          </>
        ) : null}
      </View>

      <AppText className="mb-3 text-sm font-semibold text-content-secondary">
        {selectedDayLabel ? `Agenda de ${selectedDayLabel}` : 'Agenda do dia'}
      </AppText>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        {loading ? (
          <>
            <SkeletonBlock lines={4} />
            <SkeletonBlock lines={4} />
            <SkeletonBlock lines={4} />
          </>
        ) : error ? (
          <ErrorState description={error} onRetry={() => void loadAgenda()} />
        ) : visibleAppointments.length === 0 ? (
          <ErrorState
            title="Nenhum agendamento encontrado"
            description="Não há agendamentos para o dia e filtros selecionados."
            onRetry={() => void loadAgenda()}
          />
        ) : (
          visibleAppointments.map((appointment) => {
            const status = getStatusBadge(appointment.status);

            return (
              <Pressable
                key={appointment.id}
                onPress={() =>
                  router.push(
                    routes.agendaActions({
                      agendamentoId: appointment.id,
                      pacienteId: appointment.pacienteId,
                      profissionalId: appointment.profissionalId,
                      recursoId: appointment.recursoId,
                      convenioId: appointment.convenioId,
                      servicoId: appointment.servicoId,
                      pacienteNome: appointment.pacienteNome || '',
                      profissionalNome: appointment.profissionalNome || '',
                      servicoNome: appointment.servicoNome || '',
                      dataHoraInicio: appointment.dataHoraInicio,
                      dataHoraFim: appointment.dataHoraFim,
                      tipoAtendimento: appointment.tipoAtendimento,
                      status: appointment.status,
                    }),
                  )
                }
                className="rounded-2xl border border-surface-border bg-surface-card p-4"
              >
                <View className="mb-2 flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <AppText className="text-base font-semibold text-content-primary">
                      {appointment.pacienteNome || 'Paciente não informado'}
                    </AppText>
                    <AppText className="mt-1 text-sm text-content-secondary">
                      {appointment.servicoNome || 'Serviço não informado'}
                    </AppText>
                  </View>
                  <Chip label={status.label} tone={status.tone} />
                </View>

                <AppText className="text-sm text-content-secondary">
                  Horário: {formatHourRange(appointment)} • Tipo: {appointment.tipoAtendimento}
                </AppText>
                <AppText className="mt-1 text-sm text-content-secondary">
                  Convênio: {appointment.convenioNome || 'Não informado'}
                </AppText>
                <AppText className="mt-1 text-sm text-content-secondary">
                  Recurso: {appointment.recursoNome || 'Não informado'}
                </AppText>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </AppScreen>
  );
}
