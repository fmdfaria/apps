import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';

interface IRequest {
  id: string;
}

@injectable()
export class DeleteConvenioUseCase {
  constructor(
    @inject('ConveniosRepository')
    private conveniosRepository: IConveniosRepository
  ) {}

  async execute({ id }: IRequest): Promise<void> {
    const convenio = await this.conveniosRepository.findById(id);

    if (!convenio) {
      throw new AppError('Convênio não encontrado.', 404);
    }

    await this.conveniosRepository.delete(id);
  }
} 