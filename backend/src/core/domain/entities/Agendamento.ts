import { randomUUID } from 'crypto';
import { Servico } from './Servico';
import { Paciente } from './Paciente';
import { Profissional } from './Profissional';
import { Recurso } from './Recurso';
import { Convenio } from './Convenio';

export class Agendamento {
  id!: string;
  pacienteId!: string;
  profissionalId!: string;
  tipoAtendimento!: string;
  recursoId!: string;
  convenioId!: string;
  servicoId!: string;
  dataHoraInicio!: Date;
  dataHoraFim!: Date;
  codLiberacao?: string | null;
  statusCodLiberacao?: string | null;
  dataCodLiberacao?: Date | null;
  status!: string;
  avaliadoPorId?: string | null;
  motivoReprovacao?: string | null;
  recebimento?: boolean;
  pagamento?: boolean;
  urlMeet?: string | null;
  googleEventId?: string | null;
  
  // Campos para gerenciamento de séries recorrentes
  serieId?: string | null;
  serieMaster?: boolean;
  instanciaData?: Date | null;
  
  // Campos adicionais
  compareceu?: boolean | null;
  assinaturaPaciente?: boolean | null;
  assinaturaProfissional?: boolean | null;
  dataAtendimento?: Date | null;
  observacoes?: string | null;
  resultadoConsulta?: string | null;

  // Campo calculado - número da sessão
  numeroSessao?: number;

  createdAt!: Date;
  updatedAt!: Date;

  // Relacionamentos
  paciente?: Paciente;
  profissional?: Profissional;
  servico?: Servico;
  recurso?: Recurso;
  convenio?: Convenio;

  constructor(
    props: Omit<Agendamento, 'id' | 'createdAt' | 'updatedAt' | 'paciente' | 'profissional' | 'servico' | 'recurso' | 'convenio'>,
    id?: string
  ) {
    Object.assign(this, props);
    if (!id) {
      this.id = randomUUID();
    } else {
      this.id = id;
    }
  }
} 