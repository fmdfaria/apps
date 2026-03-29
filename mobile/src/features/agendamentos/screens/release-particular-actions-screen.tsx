import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { showConfirmDialog } from '@/components/ui/confirm-dialog';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import {
  getPrecosParticulares,
  liberarAgendamentoParticular,
  updateAgendamento,
} from '@/features/agendamentos/services/agendamentos-api';
import { consumeRecebimentoContaCriada } from '@/features/agendamentos/services/release-particular-recebimento-flow';
import type { PrecoParticular } from '@/features/agendamentos/types';
import { routes } from '@/navigation/routes';
import { useToast } from '@/providers/toast-provider';
import { applyDateMaskSlash, dateBrSlashToIso, isoToDateBrSlash } from '@/utils/date';

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

function formatMoney(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Não informado';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarPagamento(precoInfo?: { tipoPagamento?: string | null; diaPagamento?: number | null; pagamentoAntecipado?: boolean | null } | null) {
  if (!precoInfo) return '-';

  const parts: string[] = [];
  if (precoInfo.tipoPagamento) parts.push(precoInfo.tipoPagamento);
  if (precoInfo.diaPagamento) parts.push(String(precoInfo.diaPagamento));
  parts.push(precoInfo.pagamentoAntecipado ? 'SIM' : 'NAO');

  return parts.length > 0 ? parts.join(' - ') : '-';
}

function normalizeWhatsapp(value?: string) {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function getTodayIso() {
  return new Date().toISOString().split('T')[0];
}

function formatMesAnoDisplay(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const mes = date.toLocaleDateString('pt-BR', { month: 'long' });
  const mesCapitalizado = mes.slice(0, 1).toUpperCase() + mes.slice(1);
  return `${mesCapitalizado} ${date.getFullYear()}`;
}

function convertToLocalIso(value?: string | null) {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
}

function getWebhookUrl() {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.EXPO_PUBLIC_WEBHOOK_SOLICITAR_LIBERACAO_PARTICULAR_URL || '';
}

function findPrecoParticular(precos: PrecoParticular[], pacienteId: string, servicoId: string) {
  return precos.find((item) => item.pacienteId === pacienteId && item.servicoId === servicoId) || null;
}

type AgendamentoWebhook = {
  id?: string;
  pacienteId?: string;
  pacienteNome?: string;
  profissionalNome?: string;
  servicoId?: string;
  servicoNome?: string;
  convenioId?: string;
  dataHoraInicio?: string | null;
  dataHoraFim?: string | null;
  status?: string;
  paciente?: {
    nomeCompleto?: string;
    whatsapp?: string | null;
  } | null;
  profissional?: {
    nome?: string;
  } | null;
  servico?: {
    nome?: string;
  } | null;
  pacienteWhatsapp?: string | null;
  [key: string]: unknown;
};

function parseAgendamentoRaw(value?: string) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as AgendamentoWebhook;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function ReleaseParticularActionsScreen() {
  const params = useLocalSearchParams<{
    agendamentoId: string;
    agendamentoRaw?: string;
    agendamentoIds?: string;
    pacienteId: string;
    convenioId?: string;
    pacienteNome?: string;
    pacienteWhatsapp?: string;
    profissionalNome?: string;
    servicoNome?: string;
    servicoId?: string;
    mesAnoDisplay?: string;
    dataHoraInicio?: string;
    status?: string;
    recebimento?: string;
    dataLiberacao?: string;
    quantidade?: string;
    precoUnitario?: string;
    precoTotal?: string;
    tipoPagamento?: string;
    diaPagamento?: string;
    pagamentoAntecipado?: string;
  }>();
  const router = useRouter();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState(params.status || 'AGENDADO');
  const [actionLoading, setActionLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [liberarSheetVisible, setLiberarSheetVisible] = useState(false);
  const [recebimento, setRecebimento] = useState(false);
  const [dataLiberacao, setDataLiberacao] = useState(
    isoToDateBrSlash(params.dataLiberacao?.substring(0, 10) || getTodayIso()),
  );
  const [precoParticular, setPrecoParticular] = useState<PrecoParticular | null>(null);

  const quantidadeParam = Number(params.quantidade || '0');
  const quantidadeDisplay = Number.isFinite(quantidadeParam) && quantidadeParam > 0 ? quantidadeParam : 1;
  const precoTotalParam = Number(params.precoTotal || 'NaN');
  const precoUnitarioParam = Number(params.precoUnitario || 'NaN');
  const diaPagamentoParam = Number(params.diaPagamento || 'NaN');
  const agendamentoRaw = useMemo(() => parseAgendamentoRaw(params.agendamentoRaw), [params.agendamentoRaw]);

  const pacienteWhatsappPayload = useMemo(() => {
    const fromRawTop = typeof agendamentoRaw?.pacienteWhatsapp === 'string' ? agendamentoRaw.pacienteWhatsapp : '';
    const fromRawNested = agendamentoRaw?.paciente?.whatsapp || '';
    return fromRawTop || fromRawNested || params.pacienteWhatsapp || '';
  }, [agendamentoRaw, params.pacienteWhatsapp]);

  const canLiberar = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos-liberar-particular/:id', method: 'PUT' }),
    [permissions],
  );

  useFocusEffect(
    useCallback(() => {
      const flowState = consumeRecebimentoContaCriada(params.agendamentoId);
      if (flowState) {
        setRecebimento(true);
        if (flowState.liberado) {
          setStatus('LIBERADO');
        }
      }
    }, [params.agendamentoId]),
  );

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const precos = await getPrecosParticulares();
        if (!active) return;
        const servicoId = params.servicoId || '';
        setPrecoParticular(findPrecoParticular(precos, params.pacienteId, servicoId));
      } catch (error) {
        if (!active) return;
        showToast({ message: parseApiError(error, 'Não foi possível carregar os preços particulares.') });
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, [params.pacienteId, params.servicoId, showToast]);

  const hasPrecoCadastro = useMemo(
    () => Number.isFinite(precoUnitarioParam) || Number.isFinite(precoTotalParam) || typeof precoParticular?.preco === 'number',
    [precoParticular?.preco, precoTotalParam, precoUnitarioParam],
  );

  const pagamentoAntecipadoEfetivo = useMemo(() => {
    const fromParams = parseBooleanParam(params.pagamentoAntecipado);
    if (fromParams !== null) return fromParams;
    return precoParticular?.pagamentoAntecipado ?? null;
  }, [params.pagamentoAntecipado, precoParticular]);

  const podeSolicitarLiberacao = useMemo(
    () => hasPrecoCadastro && pagamentoAntecipadoEfetivo === true,
    [hasPrecoCadastro, pagamentoAntecipadoEfetivo],
  );

  const motivoBloqueioSolicitacao = useMemo(() => {
    if (!hasPrecoCadastro) return 'Não é possível solicitar liberação sem preço particular cadastrado.';
    if (pagamentoAntecipadoEfetivo !== true) return 'Só é possível solicitar liberação para pagamento antecipado.';
    return null;
  }, [hasPrecoCadastro, pagamentoAntecipadoEfetivo]);

  const pagamentoResumo = useMemo(() => {
    const tipoPagamento = params.tipoPagamento || precoParticular?.tipoPagamento || null;
    const diaPagamento =
      Number.isFinite(diaPagamentoParam) && diaPagamentoParam > 0
        ? diaPagamentoParam
        : typeof precoParticular?.diaPagamento === 'number'
          ? precoParticular.diaPagamento
          : null;

    const hasInfo = Boolean(tipoPagamento || diaPagamento || precoParticular || params.pagamentoAntecipado);
    if (!hasInfo) return '-';

    return formatarPagamento({
      tipoPagamento,
      diaPagamento,
      pagamentoAntecipado: pagamentoAntecipadoEfetivo === true,
    });
  }, [diaPagamentoParam, pagamentoAntecipadoEfetivo, params.pagamentoAntecipado, params.tipoPagamento, precoParticular]);

  const precoDisplay = useMemo(() => {
    if (quantidadeDisplay > 1 && Number.isFinite(precoTotalParam)) return precoTotalParam;
    if (Number.isFinite(precoUnitarioParam)) return precoUnitarioParam;
    return precoParticular?.preco ?? null;
  }, [precoParticular?.preco, precoTotalParam, precoUnitarioParam, quantidadeDisplay]);

  const isGrupoMensal = useMemo(() => {
    const tipoPagamento = (params.tipoPagamento || precoParticular?.tipoPagamento || '').toLowerCase();
    return quantidadeDisplay > 1 && tipoPagamento === 'mensal';
  }, [params.tipoPagamento, precoParticular?.tipoPagamento, quantidadeDisplay]);

  const handleRecebimentoToggle = useCallback(() => {
    if (recebimento) {
      setRecebimento(false);
      return;
    }

    const valorOriginal = typeof precoDisplay === 'number' && Number.isFinite(precoDisplay) ? precoDisplay : 0;
    const mesAnoDisplay = params.mesAnoDisplay || formatMesAnoDisplay(params.dataHoraInicio);
    const dataLiberacaoIso = dateBrSlashToIso(dataLiberacao) || getTodayIso();
    const convenioIdParam =
      params.convenioId || (typeof agendamentoRaw?.convenioId === 'string' ? (agendamentoRaw.convenioId as string) : undefined);

    setLiberarSheetVisible(false);
    router.push(
      routes.financeCreateContaReceber({
        agendamentoId: params.agendamentoId,
        agendamentoIds: params.agendamentoIds,
        pacienteId: params.pacienteId,
        convenioId: convenioIdParam,
        pacienteNome: params.pacienteNome,
        servicoNome: params.servicoNome,
        mesAnoDisplay,
        quantidade: quantidadeDisplay,
        valorOriginal,
        pagamentoAntecipado: pagamentoAntecipadoEfetivo,
        dataLiberacao: dataLiberacaoIso,
        isGrupoMensal,
      }),
    );
  }, [
    agendamentoRaw?.convenioId,
    dataLiberacao,
    isGrupoMensal,
    pagamentoAntecipadoEfetivo,
    params.agendamentoId,
    params.agendamentoIds,
    params.convenioId,
    params.dataHoraInicio,
    params.mesAnoDisplay,
    params.pacienteId,
    params.pacienteNome,
    params.servicoNome,
    precoDisplay,
    quantidadeDisplay,
    recebimento,
    router,
  ]);

  const handleOpenWhatsapp = useCallback(async () => {
    const phone = normalizeWhatsapp(pacienteWhatsappPayload);
    if (!phone) {
      showToast({ message: 'WhatsApp não informado para este paciente.' });
      return;
    }

    const nomePaciente = params.pacienteNome || 'Paciente';
    const dataConsulta = formatDateTimeForWhatsapp(params.dataHoraInicio);
    const profissional = params.profissionalNome || 'Profissional não informado';
    const valor = formatMoney(precoDisplay);
    const mensagem = `Olá, tudo bem?

A consulta para *${nomePaciente}* no dia �Y-"️ *${dataConsulta}* com profissional *${profissional}* está agendada!

Valor: ${valor}
Pix CNPJ: 52317750000195
Clínica Celebramente LTDA

Por favor, poderia me enviar o comprovante de pagamento para que eu possa confirmar sua consulta.

Agradecemos pela confiança! �Y'T
Clínica CelebraMente`;

    const encodedMessage = encodeURIComponent(mensagem);
    const appUrl = `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
    const fallbackUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

    try {
      const canOpenApp = await Linking.canOpenURL(appUrl);
      await Linking.openURL(canOpenApp ? appUrl : fallbackUrl);
    } catch {
      showToast({ message: 'Não foi possível abrir o WhatsApp.' });
    }
  }, [pacienteWhatsappPayload, params.dataHoraInicio, params.pacienteNome, params.profissionalNome, precoDisplay, showToast]);

  const handleSolicitarLiberacao = useCallback(async () => {
    if (!podeSolicitarLiberacao) {
      showToast({ message: motivoBloqueioSolicitacao || 'Solicitação de liberação indisponível.' });
      return;
    }

    const webhookUrl = getWebhookUrl();
    if (!webhookUrl) {
      showToast({ message: 'URL do webhook de liberação particular não configurada.' });
      return;
    }

    if (status === 'SOLICITADO') {
      const reenviar = await showConfirmDialog({
        title: 'Reenviar solicitação',
        message: 'Este atendimento já está como solicitado. Deseja reenviar o webhook?',
        confirmText: 'Reenviar',
        cancelText: 'Cancelar',
      });
      if (!reenviar) return;
    }

    const agendamentoPayload: AgendamentoWebhook = {
      ...(agendamentoRaw || {}),
      id: agendamentoRaw?.id || params.agendamentoId,
      pacienteId: agendamentoRaw?.pacienteId || params.pacienteId,
      pacienteNome: agendamentoRaw?.pacienteNome || agendamentoRaw?.paciente?.nomeCompleto || params.pacienteNome || '',
      pacienteWhatsapp: pacienteWhatsappPayload,
      profissionalNome: agendamentoRaw?.profissionalNome || agendamentoRaw?.profissional?.nome || params.profissionalNome || '',
      servicoId: agendamentoRaw?.servicoId || params.servicoId || '',
      servicoNome: agendamentoRaw?.servicoNome || agendamentoRaw?.servico?.nome || params.servicoNome || '',
      dataHoraInicio: convertToLocalIso(agendamentoRaw?.dataHoraInicio || params.dataHoraInicio),
      dataHoraFim: convertToLocalIso(agendamentoRaw?.dataHoraFim || null),
      status,
    };

    const payload = {
      tipo: 'INDIVIDUAL',
      agendamento: agendamentoPayload,
      precoParticular: precoParticular
        ? {
            id: precoParticular.id,
            preco: precoParticular.preco,
            tipoPagamento: precoParticular.tipoPagamento,
            diaPagamento: precoParticular.diaPagamento,
            pagamentoAntecipado: precoParticular.pagamentoAntecipado,
            notaFiscal: precoParticular.notaFiscal,
            recibo: precoParticular.recibo,
          }
        : null,
    };

    setRequestLoading(true);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
      const responseData = await response.json().catch(() => ({}));

      await updateAgendamento(params.agendamentoId, { status: 'SOLICITADO' });
      setStatus('SOLICITADO');

      const message =
        (responseData as { message?: string; msg?: string; description?: string }).message ||
        (responseData as { message?: string; msg?: string; description?: string }).msg ||
        (responseData as { message?: string; msg?: string; description?: string }).description ||
        'Solicitação enviada com sucesso.';

      showToast({ message });
    } catch (error) {
      showToast({ message: parseApiError(error, 'Não foi possível solicitar a liberação.') });
    } finally {
      setRequestLoading(false);
    }
  }, [
    agendamentoRaw,
    motivoBloqueioSolicitacao,
    params.agendamentoId,
    params.dataHoraInicio,
    params.pacienteId,
    params.pacienteNome,
    params.profissionalNome,
    params.servicoId,
    params.servicoNome,
    pacienteWhatsappPayload,
    podeSolicitarLiberacao,
    precoParticular,
    showToast,
    status,
  ]);

  const handleLiberar = useCallback(async () => {
    if (!canLiberar) {
      showToast({ message: 'Você não tem permissão para liberar atendimento particular.' });
      return;
    }

    if (!recebimento) {
      showToast({ message: 'Marque "Recebido do paciente" para criar a conta a receber antes de liberar.' });
      return;
    }

    if (!dataLiberacao.trim()) {
      showToast({ message: 'Informe a data de liberação.' });
      return;
    }

    const dataLiberacaoIso = dateBrSlashToIso(dataLiberacao.trim());
    if (!dataLiberacaoIso) {
      showToast({ message: 'Informe a data no formato DD/MM/AAAA.' });
      return;
    }

    const confirmed = await showConfirmDialog({
      title: 'Liberar atendimento',
      message: 'Deseja realmente liberar este atendimento particular?',
      confirmText: 'Liberar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    setActionLoading(true);
    try {
      await liberarAgendamentoParticular(params.agendamentoId, {
        recebimento,
        dataLiberacao: dataLiberacaoIso,
        pagamentoAntecipado: false,
      });
      setStatus('LIBERADO');
      setLiberarSheetVisible(false);
      showToast({ message: 'Atendimento particular liberado com sucesso.' });
    } catch (error) {
      showToast({ message: parseApiError(error, 'Não foi possível liberar o atendimento particular.') });
    } finally {
      setActionLoading(false);
    }
  }, [canLiberar, dataLiberacao, params.agendamentoId, recebimento, showToast]);

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
        <AppText className="mt-1 text-xs text-content-secondary">
          Profissional: {params.profissionalNome || 'Não informado'}
        </AppText>

        <View className="mt-3 gap-2">
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-xl border border-surface-border bg-surface-background px-3 py-2">
              <AppText className="text-[11px] font-semibold text-content-muted">Serviço</AppText>
              <AppText className="mt-0.5 text-xs text-content-primary">
                {params.servicoNome || 'Não informado'}
              </AppText>
            </View>
            <View className="flex-1 rounded-xl border border-surface-border bg-surface-background px-3 py-2">
              <AppText className="text-[11px] font-semibold text-content-muted">Preço</AppText>
              <AppText className="mt-0.5 text-xs text-content-primary">{formatMoney(precoDisplay)}</AppText>
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-xl border border-surface-border bg-surface-background px-3 py-2">
              <AppText className="text-[11px] font-semibold text-content-muted">Qtd</AppText>
              <AppText className="mt-0.5 text-xs text-content-primary">{quantidadeDisplay}</AppText>
            </View>
            <View className="flex-1 rounded-xl border border-surface-border bg-surface-background px-3 py-2">
              <AppText className="text-[11px] font-semibold text-content-muted">Pag - Dia - Antec</AppText>
              <AppText className="mt-0.5 text-xs text-content-primary">{pagamentoResumo}</AppText>
            </View>
          </View>
        </View>

      </View>

      <View className="gap-2">
        <Button label="WhatsApp" variant="primary" onPress={() => void handleOpenWhatsapp()} />
        <Button
          label="Solicitar Liberação"
          variant={podeSolicitarLiberacao ? 'primary' : 'secondary'}
          disabled={!podeSolicitarLiberacao || requestLoading}
          loading={requestLoading}
          onPress={() => void handleSolicitarLiberacao()}
        />
        {motivoBloqueioSolicitacao ? <AppText className="text-xs text-content-muted">{motivoBloqueioSolicitacao}</AppText> : null}
        <Button
          label="Liberar atendimento"
          variant={canLiberar ? 'primary' : 'secondary'}
          disabled={!canLiberar || actionLoading}
          onPress={() => setLiberarSheetVisible(true)}
        />
      </View>

      <BottomSheet
        visible={liberarSheetVisible}
        title="Liberar atendimento particular"
        onClose={() => setLiberarSheetVisible(false)}
        footer={
          <View className="flex-row gap-3">
            <Button label="Cancelar" variant="secondary" className="flex-1" onPress={() => setLiberarSheetVisible(false)} />
            <Button
              label="Liberar"
              className="flex-1"
              onPress={() => void handleLiberar()}
              loading={actionLoading}
              disabled={actionLoading}
            />
          </View>
        }
      >
        <View className="pb-4">
          <AppText className="mb-2 text-sm font-semibold text-content-primary">Recebimento</AppText>
          <Pressable
            className="mb-3 flex-row items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-3"
            onPress={handleRecebimentoToggle}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: recebimento }}
          >
            <View
              className={
                recebimento
                  ? 'mt-0.5 h-5 w-5 items-center justify-center rounded border border-red-600 bg-red-600'
                  : 'mt-0.5 h-5 w-5 items-center justify-center rounded border border-red-400 bg-white'
              }
            >
              {recebimento ? <AppText className="text-[11px] font-bold text-white">X</AppText> : null}
            </View>
            <View className="flex-1">
              <AppText className="text-sm font-semibold text-content-primary">Recebido do paciente</AppText>
              <AppText className="mt-1 text-xs text-red-600">
                Obrigatório. Ao marcar, abre Criar Conta a Receber. Sem conta criada não libera.
              </AppText>
            </View>
          </Pressable>
          <Input
            label="Data de liberação *"
            value={dataLiberacao}
            onChangeText={(value) => setDataLiberacao(applyDateMaskSlash(value))}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
          />
        </View>
      </BottomSheet>
    </AppScreen>
  );
}



