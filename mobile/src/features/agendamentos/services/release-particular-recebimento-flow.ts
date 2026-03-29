type RecebimentoFlowState = {
  liberado: boolean;
};

const recebimentoConfirmado = new Map<string, RecebimentoFlowState>();

export function markRecebimentoContaCriada(agendamentoId: string, state?: Partial<RecebimentoFlowState>) {
  if (!agendamentoId) return;
  recebimentoConfirmado.set(agendamentoId, {
    liberado: state?.liberado === true,
  });
}

export function consumeRecebimentoContaCriada(agendamentoId: string) {
  if (!agendamentoId) return null;
  const state = recebimentoConfirmado.get(agendamentoId) || null;
  if (state) {
    recebimentoConfirmado.delete(agendamentoId);
  }
  return state;
}
