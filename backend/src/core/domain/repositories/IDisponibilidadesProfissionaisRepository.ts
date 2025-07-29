import { DisponibilidadeProfissional } from '../entities/DisponibilidadeProfissional';

export interface ICreateDisponibilidadeProfissionalDTO {
  profissionalId: string;
  diaSemana?: number | null;
  dataEspecifica?: Date | null;
  horaInicio: Date;
  horaFim: Date;
  observacao?: string | null;
  tipo: string;
}

export interface IUpdateDisponibilidadeProfissionalDTO extends Partial<ICreateDisponibilidadeProfissionalDTO> {}

export interface IDisponibilidadesProfissionaisRepository {
  create(data: ICreateDisponibilidadeProfissionalDTO): Promise<DisponibilidadeProfissional>;
  update(id: string, data: IUpdateDisponibilidadeProfissionalDTO): Promise<DisponibilidadeProfissional>;
  findById(id: string): Promise<DisponibilidadeProfissional | null>;
  findAll(filters?: { profissionalId?: string; diaSemana?: number }): Promise<DisponibilidadeProfissional[]>;
  delete(id: string): Promise<void>;
  existsOverlapping(params: {
    profissionalId: string;
    diaSemana?: number | null;
    dataEspecifica?: Date | null;
    horaInicio: Date;
    horaFim: Date;
    excludeId?: string;
  }): Promise<boolean>;
} 