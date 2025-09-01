import React from 'react';
import { FluxoSelecao } from './FluxoSelecao';
import { useAgendamentoForm } from '../hooks/useAgendamentoForm';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
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
  /** Dados externos já carregados para evitar chamadas API extras */
  dadosExternos?: {
    profissionais?: any[];
    recursos?: any[];
    disponibilidades?: any[];
    convenios?: any[];
  };
  /** Dados para preenchimento manual sem acionar carregamento automático */
  dadosDoubleClick?: {
    profissionalId: string;
    data: string;
    hora: string;
    recursoId: string;
    tipoAtendimento: 'presencial' | 'online';
  };
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
  titulo,
  dadosExternos,
  dadosDoubleClick
}) => {
  // Hook unificado de agendamento com todos os dados e funcionalidades
  const agendamentoContext = useAgendamentoForm({
    isOpen,
    preenchimentoInicial,
    onSuccess,
    onClose,
    dadosExternos,
    dadosDoubleClick
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
    <>
      <FluxoSelecao
        isOpen={isOpen}
        onClose={onClose}
        context={agendamentoContext}
        onSubmit={handleSubmit}
        titulo={titulo}
      />

      {/* Modal moderno de confirmação de recursos */}
      <ConfirmationDialog
        open={agendamentoContext.showResourceConfirmation}
        onClose={agendamentoContext.handleResourceCancel}
        type="alert"
        title="Recurso Inconsistente Detectado"
        description="O recurso selecionado não está configurado nas disponibilidades do profissional para este horário específico."
        details={agendamentoContext.resourceConfirmationData ? [
          `Recurso: ${agendamentoContext.resourceConfirmationData.recursoNome}`,
          `Profissional: ${agendamentoContext.resourceConfirmationData.profissionalNome}`,
          `Isso pode indicar um conflito de agenda ou configuração incompleta.`
        ] : []}
        actions={[
          {
            label: "Continuar Mesmo Assim",
            onClick: agendamentoContext.handleResourceConfirmation,
            className: "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg hover:shadow-xl font-semibold px-6 transition-all duration-200"
          },
          {
            label: "Escolher Outro Recurso",
            variant: "outline",
            onClick: agendamentoContext.handleResourceCancel,
            className: "border-2 border-gray-300 text-gray-700 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 font-semibold px-6 transition-all duration-200"
          }
        ]}
        defaultActions={false}
        showCloseButton={true}
        maxWidth="lg"
      />

      {/* Modal de conflitos de recorrência */}
      <ConfirmationDialog
        open={agendamentoContext.showConflictModal}
        onClose={agendamentoContext.handleConflictModalClose}
        type="error"
        title="Conflitos de Disponibilidade Detectados"
        description={(() => {
          return `🚫 **ATENÇÃO:** Não é possível criar agendamentos... Foram encontrados ${agendamentoContext.conflitosRecorrencia?.totalConflitos || 0} conflito(s) em ${agendamentoContext.conflitosRecorrencia?.totalDatas || 0} agendamento(s).`;
        })()}
        details={[
          // Cabeçalho da tabela
          '| Data | Hora | Paciente Agendado | Serviço |',
          '|------|------|-------------------|---------|',
          // Linhas da tabela
          ...(agendamentoContext.conflitosRecorrencia?.datasComConflito?.map(conflito => {
            const dataFormatada = new Date(conflito.data + 'T00:00:00').toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: '2-digit',
              month: '2-digit'
            });
            const paciente = conflito.agendamentoConflitante?.pacienteNome || '-';
            const servico = conflito.agendamentoConflitante?.servicoNome || 
                          (conflito.tipo === 'indisponivel' ? conflito.motivo : '-');
            
            return `| ${dataFormatada} | ${conflito.hora} | ${paciente} | ${servico} |`;
          }) || []),
        ]}
        actions={[
          {
            label: "Entendi, vou ajustar",
            onClick: agendamentoContext.handleConflictModalClose,
            className: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl font-semibold px-6 transition-all duration-200"
          }
        ]}
        defaultActions={false}
        showCloseButton={true}
        maxWidth="4xl"  
      />
    </>
  );
};