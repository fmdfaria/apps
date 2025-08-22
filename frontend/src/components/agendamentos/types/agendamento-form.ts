import type { CreateAgendamentoData } from '@/services/agendamentos';
import type { TipoRecorrencia } from '@/types/Agendamento';
import type { Paciente } from '@/types/Paciente';
import type { Profissional } from '@/types/Profissional';
import type { Convenio } from '@/types/Convenio';
import type { Servico } from '@/types/Servico';
import type { Recurso } from '@/types/Recurso';
import type { ProfissionalServico } from '@/services/profissionais-servicos';
import type { ConflitosRecorrencia } from '@/services/verificacao-disponibilidade-recorrencia';

export type TipoFluxo = 'por-profissional' | 'por-data';


export interface RecorrenciaState {
  tipo: TipoRecorrencia;
  repeticoes: number;
  ate: string;
}

export interface AgendamentoFormState {
  formData: CreateAgendamentoData;
  dataAgendamento: string;
  horaAgendamento: string;
  temRecorrencia: boolean;
  recorrencia: RecorrenciaState;
  tipoFluxo: TipoFluxo | null;
}

export interface AgendamentoDataState {
  pacientes: Paciente[];
  profissionais: Profissional[];
  profissionaisPorServico: ProfissionalServico[];
  convenios: Convenio[];
  servicos: Servico[];
  recursos: Recurso[];
  conveniosDoProfissional: Convenio[];
  servicosDoProfissional: Servico[];
  disponibilidades: any[];
  agendamentosDoDia?: any[];
}

export interface AgendamentoLoadingState {
  loading: boolean;
  loadingData: boolean;
  loadingProfissionaisPorServico: boolean;
}

export interface AgendamentoFormContext {
  state: AgendamentoFormState;
  dataState: AgendamentoDataState;
  loadingState: AgendamentoLoadingState;
  updateFormData: (data: Partial<CreateAgendamentoData>) => void;
  updateDataAgendamento: (data: string) => void;
  updateHoraAgendamento: (hora: string) => void;
  updateTemRecorrencia: (tem: boolean) => void;
  updateRecorrencia: (recorrencia: Partial<RecorrenciaState>) => void;
  updateTipoFluxo: (tipo: TipoFluxo | null) => void;
  resetForm: () => void;
  carregarDados: () => Promise<void>;
  carregarDadosDoProfissional: (profissionalId: string) => Promise<void>;
  carregarProfissionaisPorServico: (servicoId: string) => Promise<void>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  // Estados e funções do modal de confirmação de recursos
  showResourceConfirmation: boolean;
  resourceConfirmationData: {
    recursoNome: string;
    profissionalNome: string;
    dadosParaEnvio: any;
  } | null;
  handleResourceConfirmation: () => Promise<void>;
  handleResourceCancel: () => void;
  // Estados e funções do modal de conflitos
  showConflictModal: boolean;
  conflitosRecorrencia: ConflitosRecorrencia | null;
  handleConflictModalClose: () => void;
} 