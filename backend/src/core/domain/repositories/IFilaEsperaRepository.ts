import { FilaEspera } from '../../domain/entities/FilaEspera';

export interface ICreateFilaEsperaDTO {
  pacienteId: string;
  servicoId: string;
  profissionalId?: string | null;
  horarioPreferencia: string;
  observacao?: string | null;
  status?: string | null;
  ativo?: boolean;
}

export interface IFilaEsperaRepository {
  create(data: ICreateFilaEsperaDTO): Promise<FilaEspera>;
  findById(id: string): Promise<FilaEspera | null>;
  findAll(): Promise<FilaEspera[]>;
  findAllActive(): Promise<FilaEspera[]>;
  save(item: FilaEspera): Promise<FilaEspera>;
  delete(id: string): Promise<void>;
}


