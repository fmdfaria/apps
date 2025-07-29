import { inject, injectable } from 'tsyringe';
import { IEspecialidadesRepository } from '../../../domain/repositories/IEspecialidadesRepository';
import { AppError } from '../../../../shared/errors/AppError';
import { Especialidade } from '../../../domain/entities/Especialidade';

interface IRequest {
  id: string;
  nome: string;
}

@injectable()
export class UpdateEspecialidadeUseCase {
  constructor(
    @inject('EspecialidadesRepository')
    private especialidadesRepository: IEspecialidadesRepository
  ) {}

  async execute({ id, nome }: IRequest): Promise<Especialidade> {
    const especialidade = await this.especialidadesRepository.findById(id);

    if (!especialidade) {
      throw new AppError('Especialidade não encontrada.', 404);
    }

    const especialidadeComMesmoNome = await this.especialidadesRepository.findByName(nome);

    if (especialidadeComMesmoNome && especialidadeComMesmoNome.id !== id) {
      throw new AppError('Já existe uma especialidade com este nome.');
    }

    especialidade.nome = nome;

    await this.especialidadesRepository.save(especialidade);

    return especialidade;
  }
} 