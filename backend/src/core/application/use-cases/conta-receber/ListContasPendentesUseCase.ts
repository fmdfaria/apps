import { injectable, inject } from 'tsyringe';
import { IContasReceberRepository } from '../../../domain/repositories/IContasReceberRepository';
import { ContaReceber } from '../../../domain/entities/ContaReceber';

@injectable()
export class ListContasPendentesUseCase {
  constructor(
    @inject('ContasReceberRepository')
    private contasReceberRepository: IContasReceberRepository
  ) {}

  async execute(empresaId?: string): Promise<ContaReceber[]> {
    return this.contasReceberRepository.findPendentes(empresaId);
  }
}