import { inject, injectable } from 'tsyringe';
import { Paciente } from '../../../domain/entities/Paciente';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';

@injectable()
export class ListPacientesUseCase {
  constructor(
    @inject('PacientesRepository')
    private pacientesRepository: IPacientesRepository
  ) {}

  async execute(): Promise<Paciente[]> {
    const pacientes = await this.pacientesRepository.findAll();
    return pacientes;
  }
} 