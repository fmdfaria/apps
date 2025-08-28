import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { FilaEspera } from '../../../domain/entities/FilaEspera';
import { IFilaEsperaRepository } from '../../../domain/repositories/IFilaEsperaRepository';

interface IRequest {
  id: string;
  pacienteId: string;
  servicoId: string;
  profissionalId?: string | null;
  horarioPreferencia: string;
  observacao?: string | null;
  status?: string | null;
  ativo?: boolean;
}

@injectable()
export class UpdateFilaEsperaUseCase {
  constructor(
    @inject('FilaEsperaRepository')
    private filaEsperaRepository: IFilaEsperaRepository
  ) {}

  async execute({ id, ...data }: IRequest): Promise<FilaEspera> {
    const item = await this.filaEsperaRepository.findById(id);
    if (!item) {
      throw new AppError('Item da fila de espera não encontrado.', 404);
    }

    item.pacienteId = data.pacienteId;
    item.servicoId = data.servicoId;
    item.profissionalId = data.profissionalId ?? null;
    item.horarioPreferencia = data.horarioPreferencia;
    item.observacao = data.observacao ?? null;
    item.status = data.status ?? item.status;
    if (typeof data.ativo === 'boolean') item.ativo = data.ativo;

    const updated = await this.filaEsperaRepository.save(item);
    return updated;
  }
}


