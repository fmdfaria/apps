import React from 'react';
import { FluxoSelecao } from './FluxoSelecao';
import { useAgendamentoForm } from '../hooks/useAgendamentoForm';
import type { TipoFluxo } from '../types/agendamento-form';

interface AgendamentoModalProps {
  /** Controla se o modal está aberto */
  isOpen: boolean;
  /** Função chamada ao fechar o modal */
  onClose: () => void;
  /** Função chamada após sucesso na criação do agendamento */
  onSuccess: () => void;
  /** Dados opcionais para pré-preenchimento do formulário */
  preenchimentoInicial?: {
    profissionalId?: string;
    dataHoraInicio?: string;
    pacienteId?: string;
    servicoId?: string;
    convenioId?: string;
    recursoId?: string;
    tipoAtendimento?: 'presencial' | 'online';
    tipoFluxo?: TipoFluxo;
  };
  /** Função personalizada para submit (opcional, usa padrão do hook se não fornecida) */
  onCustomSubmit?: (e: React.FormEvent) => Promise<void>;
  /** Título customizado para o modal (opcional) */
  titulo?: string;
}

/**
 * Modal unificado para criação de agendamentos.
 * 
 * Centraliza toda a lógica de agendamento em um único componente,
 * eliminando duplicação entre AgendamentosPage, CalendarioPage e outros casos de uso.
 * 
 * Suporte completo a:
 * - Fluxos "Por Profissional" e "Por Data"
 * - Pré-preenchimento de campos
 * - Cálculos de ocupação unificados
 * - Validação de disponibilidade
 */
export const AgendamentoModal: React.FC<AgendamentoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preenchimentoInicial,
  onCustomSubmit,
  titulo
}) => {
  // Hook unificado de agendamento com todos os dados e funcionalidades
  const agendamentoContext = useAgendamentoForm({
    isOpen,
    preenchimentoInicial,
    onSuccess,
    onClose
  });

  /**
   * Handler para submit do formulário
   * Usa função personalizada se fornecida, senão usa padrão do hook
   */
  const handleSubmit = async (e: React.FormEvent) => {
    if (onCustomSubmit) {
      await onCustomSubmit(e);
    } else {
      await agendamentoContext.handleSubmit(e);
    }
  };

  return (
    <FluxoSelecao
      isOpen={isOpen}
      onClose={onClose}
      context={agendamentoContext}
      onSubmit={handleSubmit}
      titulo={titulo}
    />
  );
};