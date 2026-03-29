import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { showConfirmDialog } from '@/components/ui/confirm-dialog';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { editAppointment, setAppointmentStatus } from '@/features/agenda/services/my-agenda-api';
import { validarRecursoConformeDisponibilidade, verificarHorariosProfissional } from '@/features/agenda/services/appointment-validation';
import type { AppointmentStatus } from '@/features/agenda/types';
import { routes } from '@/navigation/routes';
import { useToast } from '@/providers/toast-provider';
import type { StatusTone } from '@/types/status';

function parseApiError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getStatusBadge(status: string | undefined): { label: string; tone: StatusTone } {
  const normalized = (status || '').toUpperCase();
  switch (normalized) {
    case 'AGENDADO':
      return { label: 'Agendado', tone: 'info' };
    case 'SOLICITADO':
      return { label: 'Solicitado', tone: 'warning' };
    case 'LIBERADO':
      return { label: 'Liberado', tone: 'success' };
    case 'ATENDIDO':
      return { label: 'Atendido', tone: 'warning' };
    case 'FINALIZADO':
      return { label: 'Finalizado', tone: 'success' };
    case 'CANCELADO':
      return { label: 'Cancelado', tone: 'danger' };
    case 'PENDENTE':
      return { label: 'Pendente', tone: 'danger' };
    default:
      return { label: normalized || 'Não informado', tone: 'neutral' };
  }
}

function getDateAndTimeFromIso(value?: string) {
  if (!value) return { date: '', time: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
}

function formatDateToBr(date: Date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatYmdToBr(ymd: string) {
  const [yyyy, mm, dd] = ymd.split('-');
  if (!yyyy || !mm || !dd) return '';
  return `${dd}/${mm}/${yyyy}`;
}

function parseBrToYmd(dateBr: string) {
  const clean = dateBr.trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(clean);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const month = Number(mm);
  const day = Number(dd);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${yyyy}-${mm}-${dd}`;
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

export function AgendaActionsScreen() {
  const params = useLocalSearchParams<{
    agendamentoId: string;
    pacienteId: string;
    profissionalId: string;
    recursoId: string;
    convenioId: string;
    servicoId: string;
    pacienteNome?: string;
    profissionalNome?: string;
    servicoNome?: string;
    dataHoraInicio?: string;
    tipoAtendimento?: 'presencial' | 'online';
    status?: string;
  }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [status, setStatus] = useState((params.status || 'AGENDADO').toUpperCase() as AppointmentStatus);
  const [tipoAtendimento] = useState<'presencial' | 'online'>(params.tipoAtendimento === 'online' ? 'online' : 'presencial');
  const initialDateTime = useMemo(() => getDateAndTimeFromIso(params.dataHoraInicio), [params.dataHoraInicio]);
  const [dataInicio, setDataInicio] = useState(formatYmdToBr(initialDateTime.date));
  const [horaInicio, setHoraInicio] = useState(initialDateTime.time);
  const [editVisible, setEditVisible] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [tipoEdicaoRecorrencia, setTipoEdicaoRecorrencia] = useState<'apenas_esta' | 'esta_e_futuras' | 'toda_serie'>('apenas_esta');
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [hourPickerVisible, setHourPickerVisible] = useState(false);
  const [recursoId, setRecursoId] = useState(params.recursoId);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [horariosVerificados, setHorariosVerificados] = useState<
    Array<{ horario: string; verificacao: { status: 'disponivel' | 'ocupado' | 'indisponivel'; motivo?: string } }>
  >([]);
  const [resourceSheetVisible, setResourceSheetVisible] = useState(false);
  const [recursosAlternativos, setRecursosAlternativos] = useState<
    Array<{ recursoId: string; recursoNome: string; horaInicio: string; horaFim: string }>
  >([]);

  const statusBadge = useMemo(() => getStatusBadge(status), [status]);
  const isCancelado = status === 'CANCELADO';
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const initialYmd = parseBrToYmd(initialDateTime.date ? formatYmdToBr(initialDateTime.date) : '');
    if (initialYmd) {
      const [y, m] = initialYmd.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const monthDays = useMemo(() => buildMonthDays(calendarMonth), [calendarMonth]);
  const monthTitle = useMemo(() => calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), [calendarMonth]);
  const horariosDisponiveis = useMemo(
    () => horariosVerificados.filter((item) => item.verificacao.status === 'disponivel'),
    [horariosVerificados],
  );

  useEffect(() => {
    if (!editVisible) return;
    const dataInicioYmd = parseBrToYmd(dataInicio);
    if (!dataInicioYmd || !params.profissionalId) return;
    const [ano, mes, dia] = dataInicioYmd.split('-').map(Number);
    const dataSelecionada = new Date(ano, mes - 1, dia);

    let mounted = true;
    const run = async () => {
      setLoadingHorarios(true);
      try {
        const result = await verificarHorariosProfissional(params.profissionalId, dataSelecionada, params.agendamentoId);
        if (mounted) setHorariosVerificados(result);
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
  }, [dataInicio, editVisible, params.agendamentoId, params.profissionalId]);

  const handleCancelar = useCallback(async () => {
    const nextStatus: AppointmentStatus = isCancelado ? 'AGENDADO' : 'CANCELADO';
    const confirmed = await showConfirmDialog({
      title: isCancelado ? 'Reativar agendamento' : 'Confirmar exclusão',
      message: isCancelado
        ? 'Deseja reativar este agendamento para AGENDADO?'
        : 'Deseja realmente cancelar este agendamento? Esta ação será aplicada somente a este agendamento.',
      confirmText: isCancelado ? 'Reativar' : 'Cancelar',
      cancelText: 'Voltar',
    });
    if (!confirmed) return;

    setSavingStatus(true);
    try {
      await setAppointmentStatus(params.agendamentoId, nextStatus);
      setStatus(nextStatus);
      showToast({ message: nextStatus === 'CANCELADO' ? 'Agendamento cancelado com sucesso.' : 'Agendamento reativado com sucesso.' });
      router.replace(routes.tabsAgenda);
    } catch (error) {
      showToast({ message: parseApiError(error, 'Não foi possível atualizar o status do agendamento.') });
    } finally {
      setSavingStatus(false);
    }
  }, [isCancelado, params.agendamentoId, router, showToast]);

  const handleSalvarEdicao = useCallback(async () => {
    if (!dataInicio || !horaInicio) {
      showToast({ message: 'Informe data e hora de início.' });
      return;
    }

    const dataInicioYmd = parseBrToYmd(dataInicio);
    if (!dataInicioYmd) {
      showToast({ message: 'Data inválida. Use DD/MM/AAAA.' });
      return;
    }

    const dataHoraInicio = new Date(`${dataInicioYmd}T${horaInicio}:00`);
    if (Number.isNaN(dataHoraInicio.getTime())) {
      showToast({ message: 'Data ou hora inválida.' });
      return;
    }

    if (horariosVerificados.length > 0) {
      const horarioEscolhido = horariosVerificados.find((item) => item.horario === horaInicio);
      if (!horarioEscolhido) {
        showToast({ message: 'Selecione um horário válido da lista.' });
        return;
      }

      if (horarioEscolhido.verificacao.status !== 'disponivel') {
        showToast({ message: horarioEscolhido.verificacao.motivo || 'Horário indisponível para o profissional.' });
        return;
      }
    }

    const validacaoRecurso = await validarRecursoConformeDisponibilidade({
      profissionalId: params.profissionalId,
      recursoId,
      dataHora: `${dataInicioYmd}T${horaInicio}`,
    });

    if (!validacaoRecurso.valido) {
      showToast({
        message: validacaoRecurso.mensagem || 'Conflito de disponibilidade de recurso para este horário.',
      });

      if (validacaoRecurso.alternativas.length > 0) {
        setRecursosAlternativos(validacaoRecurso.alternativas);
        if (!validacaoRecurso.alternativas.some((item) => item.recursoId === recursoId)) {
          setRecursoId(validacaoRecurso.alternativas[0].recursoId);
        }
        setResourceSheetVisible(true);
      }
      return;
    }

    setSavingEdit(true);
    try {
      await editAppointment(params.agendamentoId, {
        pacienteId: params.pacienteId,
        profissionalId: params.profissionalId,
        recursoId,
        convenioId: params.convenioId,
        servicoId: params.servicoId,
        tipoAtendimento,
        dataHoraInicio: dataHoraInicio.toISOString(),
        tipoEdicaoRecorrencia,
      });

      showToast({
        message:
          tipoEdicaoRecorrencia === 'apenas_esta'
            ? 'Agendamento atualizado com sucesso.'
            : tipoEdicaoRecorrencia === 'esta_e_futuras'
              ? 'Este agendamento e os futuros da série foram atualizados com sucesso.'
              : 'Toda a série de agendamentos foi atualizada com sucesso.',
      });
      setEditVisible(false);
      router.replace(routes.tabsAgenda);
    } catch (error) {
      showToast({ message: parseApiError(error, 'Não foi possível editar o agendamento.') });
    } finally {
      setSavingEdit(false);
    }
  }, [
    dataInicio,
    horaInicio,
    horariosVerificados,
    params.agendamentoId,
    params.convenioId,
    params.pacienteId,
    params.profissionalId,
    params.servicoId,
    recursoId,
    router,
    showToast,
    tipoAtendimento,
    tipoEdicaoRecorrencia,
  ]);

  const handleRegistrarAtendimento = useCallback(() => {
    router.push(
      routes.atendimentoActions({
        agendamentoId: params.agendamentoId,
        pacienteId: params.pacienteId,
        ...(params.pacienteNome ? { pacienteNome: params.pacienteNome } : {}),
        ...(params.profissionalId ? { profissionalId: params.profissionalId } : {}),
        ...(params.profissionalNome ? { profissionalNome: params.profissionalNome } : {}),
        ...(params.convenioId ? { convenioId: params.convenioId } : {}),
        ...(params.tipoAtendimento ? { tipoAtendimento: params.tipoAtendimento } : {}),
        ...(params.dataHoraInicio ? { dataHoraInicio: params.dataHoraInicio } : {}),
        ...(params.servicoNome ? { servicoNome: params.servicoNome } : {}),
        ...(status ? { status } : {}),
      }),
    );
  }, [
    params.agendamentoId,
    params.convenioId,
    params.dataHoraInicio,
    params.pacienteId,
    params.pacienteNome,
    params.profissionalId,
    params.profissionalNome,
    params.servicoNome,
    params.tipoAtendimento,
    router,
    status,
  ]);

  return (
    <AppScreen>
      <View className="mb-3 rounded-2xl border border-surface-border bg-surface-card p-4">
        <View className="flex-row items-start justify-between gap-3">
          <AppText className="flex-1 text-base font-semibold text-content-primary">
            {params.pacienteNome || 'Paciente não informado'}
          </AppText>
          <Chip label={statusBadge.label} tone={statusBadge.tone} />
        </View>
        <AppText className="mt-1 text-xs text-content-secondary">Profissional: {params.profissionalNome || 'Não informado'}</AppText>
        <AppText className="mt-1 text-xs text-content-secondary">Serviço: {params.servicoNome || 'Não informado'}</AppText>
        <AppText className="mt-1 text-xs text-content-secondary">Início: {params.dataHoraInicio ? new Date(params.dataHoraInicio).toLocaleString('pt-BR') : 'Não informado'}</AppText>
      </View>

      <View className="gap-2">
        <Button label="Registrar Atendimento" className="bg-amber-500" onPress={handleRegistrarAtendimento} />
        <Button label="Editar Agendamento" onPress={() => setEditVisible(true)} />
        <Button
          label={isCancelado ? 'Reativar' : 'Cancelar Agendamento'}
          variant={isCancelado ? 'secondary' : 'primary'}
          className={isCancelado ? undefined : 'bg-red-600'}
          loading={savingStatus}
          onPress={() => void handleCancelar()}
        />
      </View>

      <BottomSheet
        visible={editVisible}
        title="Editar agendamento"
        onClose={() => setEditVisible(false)}
        footer={
          <View className="flex-row gap-3">
            <Button label="Cancelar" variant="secondary" className="flex-1" onPress={() => setEditVisible(false)} />
            <Button label="Salvar" className="flex-1" loading={savingEdit} onPress={() => void handleSalvarEdicao()} />
          </View>
        }
      >
        <View className="pb-4">
          <Pressable onPress={() => setCalendarVisible(true)}>
            <View pointerEvents="none">
              <Input label="Data de início" value={dataInicio} editable={false} placeholder="DD/MM/AAAA" />
            </View>
          </Pressable>

          <View className="mt-3">
            <Pressable onPress={() => setHourPickerVisible(true)}>
              <View pointerEvents="none">
                <Input label="Hora de início" value={horaInicio} editable={false} placeholder={loadingHorarios ? 'Verificando...' : 'Toque para selecionar'} />
              </View>
            </Pressable>
            <AppText className="mt-2 text-xs text-content-secondary">
              {loadingHorarios
                ? 'Verificando disponibilidade do profissional...'
                : horariosDisponiveis.length
                  ? `${horariosDisponiveis.length} horários disponíveis para esta data`
                  : 'Não há horários disponíveis para esta data'}
            </AppText>
          </View>

          <View className="mt-3">
            <AppText className="mb-2 text-sm font-semibold text-content-primary">Aplicar edição em</AppText>
            <View className="gap-2">
              <Pressable
                onPress={() => setTipoEdicaoRecorrencia('apenas_esta')}
                className="flex-row items-center rounded-xl border border-surface-border bg-surface-card px-3 py-3"
              >
                <View
                  className={`mr-3 h-5 w-5 items-center justify-center rounded border ${
                    tipoEdicaoRecorrencia === 'apenas_esta' ? 'border-brand-700 bg-brand-700' : 'border-surface-border bg-white'
                  }`}
                >
                  {tipoEdicaoRecorrencia === 'apenas_esta' ? <AppText className="text-[10px] font-bold text-white">✓</AppText> : null}
                </View>
                <AppText className="text-sm text-content-primary">Apenas este agendamento</AppText>
              </Pressable>

              <Pressable
                onPress={() => setTipoEdicaoRecorrencia('esta_e_futuras')}
                className="flex-row items-center rounded-xl border border-surface-border bg-surface-card px-3 py-3"
              >
                <View
                  className={`mr-3 h-5 w-5 items-center justify-center rounded border ${
                    tipoEdicaoRecorrencia === 'esta_e_futuras' ? 'border-brand-700 bg-brand-700' : 'border-surface-border bg-white'
                  }`}
                >
                  {tipoEdicaoRecorrencia === 'esta_e_futuras' ? <AppText className="text-[10px] font-bold text-white">✓</AppText> : null}
                </View>
                <AppText className="text-sm text-content-primary">Esta e futuras</AppText>
              </Pressable>

              <Pressable
                onPress={() => setTipoEdicaoRecorrencia('toda_serie')}
                className="flex-row items-center rounded-xl border border-surface-border bg-surface-card px-3 py-3"
              >
                <View
                  className={`mr-3 h-5 w-5 items-center justify-center rounded border ${
                    tipoEdicaoRecorrencia === 'toda_serie' ? 'border-brand-700 bg-brand-700' : 'border-surface-border bg-white'
                  }`}
                >
                  {tipoEdicaoRecorrencia === 'toda_serie' ? <AppText className="text-[10px] font-bold text-white">✓</AppText> : null}
                </View>
                <AppText className="text-sm text-content-primary">Toda a série</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={hourPickerVisible}
        title="Selecionar horário"
        onClose={() => setHourPickerVisible(false)}
        footer={
          <View className="flex-row gap-3">
            <Button label="Fechar" variant="secondary" className="flex-1" onPress={() => setHourPickerVisible(false)} />
          </View>
        }
      >
        <View className="pb-4">
          {loadingHorarios ? (
            <AppText className="text-sm text-content-secondary">Verificando horários disponíveis...</AppText>
          ) : !horariosDisponiveis.length ? (
            <AppText className="text-sm text-content-secondary">
              Não há horários disponíveis para a data selecionada.
            </AppText>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {horariosDisponiveis.map((item) => {
                const isSelected = horaInicio === item.horario;
                return (
                  <Pressable
                    key={item.horario}
                    onPress={() => {
                      setHoraInicio(item.horario);
                      setHourPickerVisible(false);
                    }}
                    className={`rounded-full border px-3 py-2 ${
                      isSelected ? 'border-brand-700 bg-brand-700' : 'border-brand-200 bg-brand-50'
                    }`}
                  >
                    <AppText className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-brand-700'}`}>{item.horario}</AppText>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={resourceSheetVisible}
        title="Selecionar recurso disponível"
        onClose={() => setResourceSheetVisible(false)}
        footer={
          <View className="flex-row gap-3">
            <Button label="Cancelar" variant="secondary" className="flex-1" onPress={() => setResourceSheetVisible(false)} />
            <Button
              label="Aplicar recurso"
              className="flex-1"
              onPress={() => {
                setResourceSheetVisible(false);
                void handleSalvarEdicao();
              }}
            />
          </View>
        }
      >
        <View className="pb-4">
          <AppText className="mb-3 text-sm text-content-secondary">
            O recurso atual não atende este horário. Selecione um recurso compatível:
          </AppText>
          <View className="gap-2">
            {recursosAlternativos.map((item) => {
              const selected = item.recursoId === recursoId;
              return (
                <Pressable
                  key={`${item.recursoId}-${item.horaInicio}-${item.horaFim}`}
                  onPress={() => setRecursoId(item.recursoId)}
                  className={`rounded-xl border p-3 ${selected ? 'border-brand-700 bg-brand-50' : 'border-surface-border bg-surface-card'}`}
                >
                  <AppText className={`text-sm font-semibold ${selected ? 'text-brand-700' : 'text-content-primary'}`}>
                    {item.recursoNome}
                  </AppText>
                  <AppText className="mt-1 text-xs text-content-secondary">
                    Disponível: {item.horaInicio} às {item.horaFim}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
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
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((week) => (
              <AppText key={week} className="flex-1 text-center text-xs font-semibold text-content-muted">
                {week}
              </AppText>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {monthDays.map((day, index) => {
              if (!day) return <View key={`empty-${index}`} className="mb-1 h-10 w-[14.28%]" />;

              const selected = dataInicio === formatDateToBr(day);
              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => {
                    setDataInicio(formatDateToBr(day));
                    setCalendarVisible(false);
                  }}
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
