import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { ConselhoProfissional } from '../../../domain/entities/ConselhoProfissional';
import { IConselhosProfissionaisRepository } from '../../../domain/repositories/IConselhosProfissionaisRepository';

interface IRequest {
  sigla: string;
  nome: string;
}

@injectable()
export class CreateConselhoProfissionalUseCase {
  constructor(
    @inject('ConselhosProfissionaisRepository')
    private conselhosProfissionaisRepository: IConselhosProfissionaisRepository
  ) {}

  async execute({ sigla, nome }: IRequest): Promise<ConselhoProfissional> {
    const siglaUpper = sigla.toUpperCase();
    const conselhoExists = await this.conselhosProfissionaisRepository.findBySigla(siglaUpper);

    if (conselhoExists) {
      throw new AppError('Conselho Profissional com esta sigla já cadastrado.');
    }

    const conselho = await this.conselhosProfissionaisRepository.create({
      sigla: siglaUpper,
      nome,
    });

    return conselho;
  }
} 