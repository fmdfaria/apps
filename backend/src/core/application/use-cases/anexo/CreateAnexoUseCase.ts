import { inject, injectable } from 'tsyringe';
import { Anexo } from '../../../domain/entities/Anexo';
import { IAnexosRepository, ICreateAnexoDTO } from '../../../domain/repositories/IAnexosRepository';

@injectable()
export class CreateAnexoUseCase {
  constructor(
    @inject('AnexosRepository')
    private anexosRepository: IAnexosRepository
  ) {}

  async execute(data: ICreateAnexoDTO): Promise<Anexo> {
    // Aqui você pode adicionar validações extras se necessário
    return this.anexosRepository.create(data);
  }
} 