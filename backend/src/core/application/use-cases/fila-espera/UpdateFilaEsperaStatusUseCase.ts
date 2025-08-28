import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { FilaEspera } from '../../../domain/entities/FilaEspera';
import { IFilaEsperaRepository } from '../../../domain/repositories/IFilaEsperaRepository';

interface IRequest {
  id: string;
  ativo: boolean;
}

@injectable()
export class UpdateFilaEsperaStatusUseCase {
  constructor(
    @inject('FilaEsperaRepository')
    private filaEsperaRepository: IFilaEsperaRepository
  ) {}

  async execute({ id, ativo }: IRequest): Promise<FilaEspera> {
    const item = await this.filaEsperaRepository.findById(id);
    if (!item) {
      throw new AppError('Item da fila de espera não encontrado.', 404);
    }
    item.ativo = ativo;
    const updated = await this.filaEsperaRepository.save(item);
    return updated;
  }
}


