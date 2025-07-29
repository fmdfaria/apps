import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAnexosRepository } from '../../../domain/repositories/IAnexosRepository';
import { Anexo } from '../../../domain/entities/Anexo';

interface IRequest {
  id: string;
  descricao?: string | null;
  nomeArquivo?: string;
  url?: string;
}

@injectable()
export class UpdateAnexoUseCase {
  constructor(
    @inject('AnexosRepository')
    private anexosRepository: IAnexosRepository
  ) {}

  async execute({ id, descricao, nomeArquivo, url }: IRequest): Promise<Anexo> {
    const anexo = await this.anexosRepository.findById(id);
    if (!anexo) {
      throw new AppError('Anexo não encontrado.', 404);
    }
    const updated = await this.anexosRepository.update(id, {
      descricao,
      nomeArquivo,
      url,
    });
    return updated;
  }
} 