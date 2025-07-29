import { inject, injectable } from 'tsyringe';
import { Anexo } from '../../../domain/entities/Anexo';
import { IAnexosRepository } from '../../../domain/repositories/IAnexosRepository';

@injectable()
export class ListAnexosUseCase {
  constructor(
    @inject('AnexosRepository')
    private anexosRepository: IAnexosRepository
  ) {}

  async execute(filters?: { entidadeTipo?: string; entidadeId?: string }): Promise<Anexo[]> {
    return this.anexosRepository.findAll(filters);
  }
} 