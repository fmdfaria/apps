import { Servico } from '../entities/Servico';

export interface ICreateServicoDTO {
  nome: string;
  descricao?: string | null;
  duracaoMinutos: number;
  preco: number;
  percentualClinica?: number | null;
  percentualProfissional?: number | null;
  valorClinica?: number | null;
  valorProfissional?: number | null;
  procedimentoPrimeiroAtendimento?: string | null;
  procedimentoDemaisAtendimentos?: string | null;
  convenioId?: string | null;
}

export interface IServicosRepository {
  create(data: ICreateServicoDTO): Promise<Servico>;
  /**
   * @deprecated Use findByNameAndDuration
   */
  findByName(nome: string): Promise<Servico | null>;
  findByNameAndDuration(nome: string, duracaoMinutos: number): Promise<Servico | null>;
  findById(id: string): Promise<Servico | null>;
  findAll(): Promise<Servico[]>;
  save(servico: Servico): Promise<Servico>;
  delete(id: string): Promise<void>;
} 