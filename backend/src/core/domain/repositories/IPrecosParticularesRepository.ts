import { PrecosParticulares } from '../entities/PrecosParticulares';

export interface ICreatePrecoParticularDTO {
  pacienteId: string;
  servicoId: string;
  preco: number;
  tipoPagamento?: string | null;
  pagamentoAntecipado?: boolean | null;
  dataPagamento?: Date | null;
}

export interface IUpdatePrecoParticularDTO extends Partial<ICreatePrecoParticularDTO> {}

export interface IPrecosParticularesRepository {
  create(data: ICreatePrecoParticularDTO): Promise<PrecosParticulares>;
  update(id: string, data: IUpdatePrecoParticularDTO): Promise<PrecosParticulares>;
  findById(id: string): Promise<PrecosParticulares | null>;
  findByPacienteAndServico(
    pacienteId: string,
    servicoId: string
  ): Promise<PrecosParticulares | null>;
  findAll(filters: {
    pacienteId?: string;
    servicoId?: string;
  }): Promise<PrecosParticulares[]>;
  delete(id: string): Promise<void>;
} 