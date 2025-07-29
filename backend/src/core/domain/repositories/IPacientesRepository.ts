import { Paciente } from '../entities/Paciente';

export interface ICreatePacienteDTO {
  nomeCompleto: string;
  tipoServico: string;
  email?: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
  dataNascimento?: Date | null;
  convenioId?: string | null;
  numeroCarteirinha?: string | null;
  dataPedidoMedico?: Date | null;
  crm?: string | null;
  cbo?: string | null;
  cid?: string | null;
  pedidoMedicoArquivo?: string | null;
  userId?: string | null;
}

export interface IPacientesRepository {
  create(data: ICreatePacienteDTO): Promise<Paciente>;
  findByCpf(cpf: string): Promise<Paciente | null>;
  findByEmail(email: string): Promise<Paciente | null>;
  findById(id: string): Promise<Paciente | null>;
  findAll(): Promise<Paciente[]>;
  save(paciente: Paciente): Promise<Paciente>;
  delete(id: string): Promise<void>;
} 