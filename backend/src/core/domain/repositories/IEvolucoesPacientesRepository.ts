import { EvolucaoPaciente } from '../entities/EvolucaoPaciente';

export interface ICreateEvolucaoPacienteDTO {
  pacienteId: string;
  agendamentoId?: string;
  profissionalId?: string;
  dataEvolucao: Date;
  objetivoSessao: string;
  descricaoEvolucao: string;
}

export interface IUpdateEvolucaoPacienteDTO extends Partial<ICreateEvolucaoPacienteDTO> {}

export interface IEvolucoesPacientesRepository {
  create(data: ICreateEvolucaoPacienteDTO): Promise<EvolucaoPaciente>;
  update(id: string, data: IUpdateEvolucaoPacienteDTO): Promise<EvolucaoPaciente>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<EvolucaoPaciente | null>;
  findAllByPaciente(pacienteId: string): Promise<EvolucaoPaciente[]>;
  findByAgendamento(agendamentoId: string): Promise<EvolucaoPaciente | null>;
  getStatusByAgendamentos(agendamentoIds: string[]): Promise<Array<{ agendamentoId: string; temEvolucao: boolean }>>;
} 