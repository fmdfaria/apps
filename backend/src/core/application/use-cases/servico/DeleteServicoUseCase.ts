import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';

interface IRequest {
  id: string;
}

@injectable()
export class DeleteServicoUseCase {
  constructor(
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository
  ) {}

  async execute({ id }: IRequest): Promise<void> {
    const servico = await this.servicosRepository.findById(id);

    if (!servico) {
      throw new AppError('Serviço não encontrado.', 404);
    }

    await this.servicosRepository.delete(id);
  }
} 