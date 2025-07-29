import { inject, injectable } from 'tsyringe';
import { IEspecialidadesRepository } from '../../../domain/repositories/IEspecialidadesRepository';
import { AppError } from '../../../../shared/errors/AppError';
import { Especialidade } from '../../../domain/entities/Especialidade';

interface IRequest {
  nome: string;
}

@injectable()
export class CreateEspecialidadeUseCase {
  constructor(
    @inject('EspecialidadesRepository')
    private especialidadesRepository: IEspecialidadesRepository
  ) {}

  async execute({ nome }: IRequest): Promise<Especialidade> {
    const especialidadeExists = await this.especialidadesRepository.findByName(nome);

    if (especialidadeExists) {
      throw new AppError('Especialidade já cadastrada.');
    }

    const especialidade = await this.especialidadesRepository.create({ nome });

    return especialidade;
  }
} 