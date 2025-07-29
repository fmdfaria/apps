import { inject, injectable } from 'tsyringe';
import { AdendoContrato } from '../../../domain/entities/AdendoContrato';
import { IAdendosContratosRepository } from '../../../domain/repositories/IAdendosContratosRepository';

@injectable()
export class ListAdendosContratosUseCase {
  constructor(
    @inject('AdendosContratosRepository')
    private adendosRepository: IAdendosContratosRepository
  ) {}

  async execute(filters?: { contratoId?: string }): Promise<AdendoContrato[]> {
    return this.adendosRepository.findAll(filters);
  }
} 