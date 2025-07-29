import { inject, injectable } from 'tsyringe';
import { IEspecialidadesRepository } from '../../../domain/repositories/IEspecialidadesRepository';
import { Especialidade } from '../../../domain/entities/Especialidade';

@injectable()
export class ListEspecialidadesUseCase {
  constructor(
    @inject('EspecialidadesRepository')
    private especialidadesRepository: IEspecialidadesRepository
  ) {}

  async execute(): Promise<Especialidade[]> {
    const especialidades = await this.especialidadesRepository.findAll();
    return especialidades;
  }
} 