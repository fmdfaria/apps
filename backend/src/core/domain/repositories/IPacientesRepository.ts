import { Paciente } from '../entities/Paciente';

export interface ICreatePacienteDTO {
  nomeCompleto: string;
  whatsapp: string;
  tipoServico: string;
  nomeResponsavel?: string | null;
  email?: string | null;
  cpf?: string | null;
  dataNascimento?: Date | null;
  convenioId?: string | null;
  numeroCarteirinha?: string | null;
  dataPedidoMedico?: Date | null;
  crm?: string | null;
  cbo?: string | null;
  cid?: string | null;
  userId?: string | null;
  ativo?: boolean;
}

export interface IPacientesRepository {
  create(data: ICreatePacienteDTO): Promise<Paciente>;
  findByCpf(cpf: string): Promise<Paciente | null>;
  findByEmail(email: string): Promise<Paciente | null>;
  findById(id: string): Promise<Paciente | null>;
  findAll(): Promise<Paciente[]>;
  findAllActive(): Promise<Paciente[]>;
  save(paciente: Paciente): Promise<Paciente>;
  delete(id: string): Promise<void>;
} 