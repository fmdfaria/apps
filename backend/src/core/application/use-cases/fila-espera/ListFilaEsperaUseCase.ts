import { inject, injectable } from 'tsyringe';
import { FilaEspera } from '../../../domain/entities/FilaEspera';
import { IFilaEsperaRepository } from '../../../domain/repositories/IFilaEsperaRepository';

@injectable()
export class ListFilaEsperaUseCase {
  constructor(
    @inject('FilaEsperaRepository')
    private filaEsperaRepository: IFilaEsperaRepository
  ) {}

  async execute(onlyActive?: boolean): Promise<FilaEspera[]> {
    if (onlyActive) {
      return this.filaEsperaRepository.findAllActive();
    }
    return this.filaEsperaRepository.findAll();
  }
}


