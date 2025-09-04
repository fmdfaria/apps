import { Configuracao } from '../entities/Configuracao';

export interface ICreateConfiguracaoDTO {
  entidadeTipo: string;
  entidadeId?: string | null;
  contexto: string;
  chave: string;
  valor: string;
  tipoValor?: string;
  descricao?: string | null;
  ativo?: boolean;
}

export interface IGetByEntityDTO {
  entidadeTipo: string;
  entidadeId?: string | null;
  contexto?: string;
}

export interface IConfiguracoesRepository {
  create(data: ICreateConfiguracaoDTO): Promise<Configuracao>;
  findById(id: string): Promise<Configuracao | null>;
  findByKey(entidadeTipo: string, entidadeId: string | null, contexto: string, chave: string): Promise<Configuracao | null>;
  findByEntity(params: IGetByEntityDTO): Promise<Configuracao[]>;
  findAll(): Promise<Configuracao[]>;
  save(configuracao: Configuracao): Promise<Configuracao>;
  delete(id: string): Promise<void>;
}