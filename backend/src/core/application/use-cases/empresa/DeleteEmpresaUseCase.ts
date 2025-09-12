import { inject, injectable } from 'tsyringe';
import { IEmpresasRepository } from '../../../domain/repositories/IEmpresasRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface DeleteEmpresaRequest {
  id: string;
}

@injectable()
export class DeleteEmpresaUseCase {
  constructor(
    @inject('EmpresasRepository')
    private empresasRepository: IEmpresasRepository
  ) {}

  async execute({ id }: DeleteEmpresaRequest): Promise<void> {
    const empresa = await this.empresasRepository.findById(id);
    if (!empresa) {
      throw new AppError('Empresa não encontrada', 404);
    }

    await this.empresasRepository.delete(id);
  }
}


