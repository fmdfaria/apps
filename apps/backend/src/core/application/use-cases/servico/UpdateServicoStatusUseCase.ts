import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Servico } from '../../../domain/entities/Servico';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';

interface IRequest {
  id: string;
  ativo: boolean;
}

@injectable()
export class UpdateServicoStatusUseCase {
  constructor(
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository
  ) {}

  async execute({ id, ativo }: IRequest): Promise<Servico> {
    const servico = await this.servicosRepository.findById(id);
    if (!servico) {
      throw new AppError('Serviço não encontrado.', 404);
    }

    servico.ativo = ativo;
    const updated = await this.servicosRepository.save(servico);
    return updated;
  }
}


