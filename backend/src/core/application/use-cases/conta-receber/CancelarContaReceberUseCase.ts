import { injectable, inject } from 'tsyringe';
import { IContasReceberRepository } from '../../../domain/repositories/IContasReceberRepository';

interface CancelarContaReceberRequest {
  motivo?: string;
}

@injectable()
export class CancelarContaReceberUseCase {
  constructor(
    @inject('ContasReceberRepository')
    private contasReceberRepository: IContasReceberRepository
  ) {}

  async execute(id: string, data: CancelarContaReceberRequest): Promise<void> {
    await this.contasReceberRepository.cancelarConta(id, data.motivo);
  }
}