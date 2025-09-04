import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IConfiguracoesRepository } from '../../../domain/repositories/IConfiguracoesRepository';

interface IRequest {
  id: string;
}

@injectable()
export class DeleteConfiguracaoUseCase {
  constructor(
    @inject('ConfiguracoesRepository')
    private configuracoesRepository: IConfiguracoesRepository
  ) {}

  async execute({ id }: IRequest): Promise<void> {
    const configuracao = await this.configuracoesRepository.findById(id);

    if (!configuracao) {
      throw new AppError('Configuração não encontrada.', 404);
    }

    await this.configuracoesRepository.delete(id);
  }
}