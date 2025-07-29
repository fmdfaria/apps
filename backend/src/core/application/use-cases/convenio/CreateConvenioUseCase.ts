import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Convenio } from '../../../domain/entities/Convenio';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';

interface IRequest {
  nome: string;
}

@injectable()
export class CreateConvenioUseCase {
  constructor(
    @inject('ConveniosRepository')
    private conveniosRepository: IConveniosRepository
  ) {}

  async execute({ nome }: IRequest): Promise<Convenio> {
    const convenioExists = await this.conveniosRepository.findByName(nome);

    if (convenioExists) {
      throw new AppError('Convênio com este nome já cadastrado.');
    }

    const convenio = await this.conveniosRepository.create({ nome });

    return convenio;
  }
} 