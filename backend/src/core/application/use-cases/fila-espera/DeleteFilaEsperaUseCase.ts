import { inject, injectable } from 'tsyringe';
import { IFilaEsperaRepository } from '../../../domain/repositories/IFilaEsperaRepository';

interface IRequest {
  id: string;
}

@injectable()
export class DeleteFilaEsperaUseCase {
  constructor(
    @inject('FilaEsperaRepository')
    private filaEsperaRepository: IFilaEsperaRepository
  ) {}

  async execute({ id }: IRequest): Promise<void> {
    await this.filaEsperaRepository.delete(id);
  }
}


