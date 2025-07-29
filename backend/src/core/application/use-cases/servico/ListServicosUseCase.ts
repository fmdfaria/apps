import { inject, injectable } from 'tsyringe';
import { Servico } from '../../../domain/entities/Servico';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';

@injectable()
export class ListServicosUseCase {
  constructor(
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository
  ) {}

  async execute(): Promise<Servico[]> {
    const servicos = await this.servicosRepository.findAll();
    return servicos;
  }
} 