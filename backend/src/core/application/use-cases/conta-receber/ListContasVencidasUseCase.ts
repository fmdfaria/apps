import { injectable, inject } from 'tsyringe';
import { IContasReceberRepository } from '../../../domain/repositories/IContasReceberRepository';
import { ContaReceber } from '../../../domain/entities/ContaReceber';

@injectable()
export class ListContasVencidasUseCase {
  constructor(
    @inject('ContasReceberRepository')
    private contasReceberRepository: IContasReceberRepository
  ) {}

  async execute(): Promise<ContaReceber[]> {
    return this.contasReceberRepository.findVencidas();
  }
}