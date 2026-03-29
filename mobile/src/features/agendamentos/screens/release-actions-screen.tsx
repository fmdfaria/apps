import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { showConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import { alterarStatusAgendamento, liberarAgendamento } from '@/features/agendamentos/services/agendamentos-api';
import type { StatusAgendamento } from '@/features/agendamentos/types';
import { routes } from '@/navigation/routes';
import { useToast } from '@/providers/toast-provider';

const STATUS_OPTIONS: Array<{ label: string; value: StatusAgendamento }> = [
  { label: 'Agendado', value: 'AGENDADO' },
  { label: 'Solicitado', value: 'SOLICITADO' },
  { label: 'Liberado', value: 'LIBERADO' },
  { label: 'Atendido', value: 'ATENDIDO' },
  { label: 'Finalizado', value: 'FINALIZADO' },
  { label: 'Cancelado', value: 'CANCELADO' },
  { label: 'Arquivado', value: 'ARQUIVADO' },
  { label: 'Pendente', value: 'PENDENTE' },
];

function parseApiError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatDateTime(value?: string) {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const data = date.toLocaleDateString('pt-BR');
  const hora = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data} às ${hora}`;
}

function formatDateTimeForWhatsapp(value?: string) {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const data = date.toLocaleDateString('pt-BR');
  const hora = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data} - ${hora}`;
}

function normalizeWhatsapp(value?: string) {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function getTodayIso() {
  return new Date().toISOString().split('T')[0];
}

export function ReleaseActionsScreen() {
  const params = useLocalSearchParams<{
    agendamentoId: string;
    pacienteId: string;
    pacienteNome?: string;
    pacienteWhatsapp?: string;
    profissionalNome?: string;
    servicoNome?: string;
    convenioNome?: string;
    dataHoraInicio?: string;
    status?: string;
    codLiberacao?: string;
    statusCodLiberacao?: string;
    dataCodLiberacao?: string;
  }>();
  const router = useRouter();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState(params.status || 'AGENDADO');
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusAgendamento>((params.status as StatusAgendamento) || 'AGENDADO');
  const [liberarSheetVisible, setLiberarSheetVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [codLiberacao, setCodLiberacao] = useState(params.codLiberacao || '');
  const [statusCodLiberacao, setStatusCodLiberacao] = useState(params.statusCodLiberacao || 'AUTORIZADO');
  const [dataLiberacao, setDataLiberacao] = useState(params.dataCodLiberacao?.substring(0, 10) || getTodayIso());

  const canLiberar = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos-liberar/:id', method: 'PUT' }),
    [permissions],
  );
  const canAlterarStatus = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos-alterar-status/:id', method: 'PUT' }),
    [permissions],
  );
  const canAnexos = useMemo(() => hasRoutePermission(permissions, { path: '/anexos', method: 'GET' }), [permissions]);
  const canPedidos = useMemo(
    () => hasRoutePermission(permissions, { path: '/pacientes/:pacienteId/pedidos', method: 'GET' }),
    [permissions],
  );

  const handleOpenWhatsapp = useCallback(async () => {
    const phone = normalizeWhatsapp(params.pacienteWhatsapp);
    if (!phone) {
      showToast({ message: 'WhatsApp não informado para este paciente.' });
      return;
    }

    const nomePaciente = params.pacienteNome || 'Paciente';
    const dataConsulta = formatDateTimeForWhatsapp(params.dataHoraInicio);
    const profissional = params.profissionalNome || 'Profissional não informado';
    const mensagem = `Olá, tudo bem?

A consulta para *${nomePaciente}* no dia \u{1F5D3}\uFE0F *${dataConsulta}* com profissional *${profissional}* está confirmada!

Por favor, poderia gerar o *Token* e me enviar por gentileza.

Agradecemos pela confiança! \u{1F499}
Clinica CelebraMente`;

    const encodedMessage = encodeURIComponent(mensagem);
    const appUrl = `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
    const fallbackUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

    try {
      const canOpenApp = await Linking.canOpenURL(appUrl);
      await Linking.openURL(canOpenApp ? appUrl : fallbackUrl);
    } catch {
      showToast({ message: 'Não foi possível abrir o WhatsApp.' });
    }
  }, [params.dataHoraInicio, params.pacienteNome, params.pacienteWhatsapp, params.profissionalNome, showToast]);

  const handleOpenPedidos = useCallback(() => {
    if (!canPedidos) {
      showToast({ message: 'Você não tem permissão para visualizar pedidos médicos.' });
      return;
    }

    router.push(routes.customerOrders(params.pacienteId, params.pacienteNome || ''));
  }, [canPedidos, params.pacienteId, params.pacienteNome, router, showToast]);

  const handleOpenAnexos = useCallback(() => {
    if (!canAnexos) {
      showToast({ message: 'Você não tem permissão para visualizar anexos.' });
      return;
    }

    router.push(routes.customerAttachments(params.pacienteId, params.pacienteNome || ''));
  }, [canAnexos, params.pacienteId, params.pacienteNome, router, showToast]);

  const handleSaveStatus = useCallback(async () => {
    if (!canAlterarStatus) {
      showToast({ message: 'Você não tem permissão para alterar status.' });
      return;
    }

    setActionLoading(true);
    try {
      await alterarStatusAgendamento(params.agendamentoId, selectedStatus);
      setStatus(selectedStatus);
      setStatusSheetVisible(false);
      showToast({ message: 'Status alterado com sucesso.' });
    } catch (err) {
      showToast({ message: parseApiError(err, 'Não foi possível alterar o status.') });
    } finally {
      setActionLoading(false);
    }
  }, [canAlterarStatus, params.agendamentoId, selectedStatus, showToast]);

  const handleLiberar = useCallback(async () => {
    if (!canLiberar) {
      showToast({ message: 'Você não tem permissão para liberar atendimento.' });
      return;
    }

    if (!codLiberacao.trim()) {
      showToast({ message: 'Informe o código de liberação.' });
      return;
    }

    if (!statusCodLiberacao.trim()) {
      showToast({ message: 'Informe o status do código.' });
      return;
    }

    if (!dataLiberacao.trim()) {
      showToast({ message: 'Informe a data de liberação.' });
      return;
    }

    const confirmed = await showConfirmDialog({
      title: 'Liberar atendimento',
      message: 'Deseja realmente liberar este atendimento?',
      confirmText: 'Liberar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    setActionLoading(true);
    try {
      await liberarAgendamento(params.agendamentoId, {
        codLiberacao: codLiberacao.trim(),
        statusCodLiberacao: statusCodLiberacao.trim(),
        dataCodLiberacao: dataLiberacao.trim(),
      });
      setStatus('LIBERADO');
      setLiberarSheetVisible(false);
      showToast({ message: 'Atendimento liberado com sucesso.' });
    } catch (err) {
      showToast({ message: parseApiError(err, 'Não foi possível liberar o atendimento.') });
    } finally {
      setActionLoading(false);
    }
  }, [canLiberar, codLiberacao, dataLiberacao, params.agendamentoId, showToast, statusCodLiberacao]);

  return (
    <AppScreen>
      <View className="mb-3 rounded-2xl border border-surface-border bg-surface-card p-4">
        <View className="flex-row items-center justify-between gap-2">
          <AppText className="flex-1 text-base font-semibold text-content-primary">
            {params.pacienteNome || 'Paciente não informado'}
          </AppText>
          <Chip label={status} tone={status === 'SOLICITADO' ? 'warning' : status === 'LIBERADO' ? 'success' : 'info'} />
        </View>
        <AppText className="mt-1 text-xs text-content-secondary">{formatDateTime(params.dataHoraInicio)}</AppText>
        <AppText className="mt-1 text-xs text-content-secondary">Profissional: {params.profissionalNome || 'Não informado'}</AppText>
        <AppText className="mt-1 text-xs text-content-secondary">Serviço: {params.servicoNome || 'Não informado'}</AppText>
        <AppText className="mt-1 text-xs text-content-secondary">Convênio: {params.convenioNome || 'Não informado'}</AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 24 }}>
        <Button label="WhatsApp" variant="primary" onPress={() => void handleOpenWhatsapp()} />

        <Button
          label="Pedidos médicos"
          variant={canPedidos ? 'primary' : 'secondary'}
          disabled={!canPedidos}
          onPress={handleOpenPedidos}
        />

        <Button
          label="Anexos"
          variant={canAnexos ? 'primary' : 'secondary'}
          disabled={!canAnexos}
          onPress={handleOpenAnexos}
        />

        <Button
          label="Alterar status"
          variant={canAlterarStatus ? 'primary' : 'secondary'}
          disabled={!canAlterarStatus || actionLoading}
          onPress={() => setStatusSheetVisible(true)}
        />

        <Button
          label="Liberar atendimento"
          variant={canLiberar ? 'primary' : 'secondary'}
          disabled={!canLiberar || actionLoading}
          onPress={() => setLiberarSheetVisible(true)}
        />
      </ScrollView>

      <BottomSheet
        visible={statusSheetVisible}
        title="Alterar status"
        onClose={() => setStatusSheetVisible(false)}
        footer={
          <View className="flex-row gap-3">
            <Button label="Cancelar" variant="secondary" className="flex-1" onPress={() => setStatusSheetVisible(false)} />
            <Button label="Salvar" className="flex-1" onPress={() => void handleSaveStatus()} loading={actionLoading} />
          </View>
        }
      >
        <View className="pb-4">
          <Select
            label="Novo status"
            value={selectedStatus}
            options={STATUS_OPTIONS}
            onChange={(value) => setSelectedStatus(value as StatusAgendamento)}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={liberarSheetVisible}
        title="Liberar atendimento"
        onClose={() => setLiberarSheetVisible(false)}
        footer={
          <View className="flex-row gap-3">
            <Button label="Cancelar" variant="secondary" className="flex-1" onPress={() => setLiberarSheetVisible(false)} />
            <Button label="Liberar" className="flex-1" onPress={() => void handleLiberar()} loading={actionLoading} />
          </View>
        }
      >
        <View className="pb-4">
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
          <View className="mt-3">
            <Input
              label="Data de liberação *"
              value={dataLiberacao}
              onChangeText={setDataLiberacao}
              placeholder="AAAA-MM-DD"
            />
          </View>
        </View>
      </BottomSheet>
    </AppScreen>
  );
}



