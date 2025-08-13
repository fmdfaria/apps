import { Profissional } from '../entities/Profissional';

export interface ICreateProfissionalDTO extends Omit<Profissional, 'id' | 'createdAt' | 'updatedAt' | 'conselho' | 'especialidades' | 'servicos'> {
  especialidadesIds: string[];
  servicosIds?: string[];
  tipo_pix?: string;
}

export interface IUpdateProfissionalDTO extends Partial<Omit<ICreateProfissionalDTO, 'cpf'>> {}

export interface ProfissionalServico {
  id: string;
  profissionalId: string;
  servicoId: string;
  profissional: {
    id: string;
    nome: string;
    cpf: string;
    email: string;
  };
  servico: {
    id: string;
    nome: string;
    duracaoMinutos: number;
    preco: number;
    convenio: {
      id: string;
      nome: string;
    };
  };
}

export interface IProfissionaisRepository {
  create(data: ICreateProfissionalDTO): Promise<Profissional>;
  update(id: string, data: IUpdateProfissionalDTO): Promise<Profissional>;
  findById(id: string): Promise<Profissional | null>;
  findByCpf(cpf: string): Promise<Profissional | null>;
  findByEmail(email: string): Promise<Profissional | null>;
  findByUserId(userId: string): Promise<Profissional | null>;
  findAll(): Promise<Profissional[]>;
  delete(id: string): Promise<void>;
  listProfissionaisServicos(): Promise<ProfissionalServico[]>;
  listProfissionaisByServico(servicoId: string): Promise<ProfissionalServico[]>;
} 