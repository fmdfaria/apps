import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { ConselhoProfissional } from '../../../domain/entities/ConselhoProfissional';
import { IConselhosProfissionaisRepository } from '../../../domain/repositories/IConselhosProfissionaisRepository';

interface IRequest {
  id: string;
  sigla: string;
  nome: string;
}

@injectable()
export class UpdateConselhoProfissionalUseCase {
  constructor(
    @inject('ConselhosProfissionaisRepository')
    private conselhosProfissionaisRepository: IConselhosProfissionaisRepository
  ) {}

  async execute({ id, sigla, nome }: IRequest): Promise<ConselhoProfissional> {
    const conselho = await this.conselhosProfissionaisRepository.findById(id);

    if (!conselho) {
      throw new AppError('Conselho Profissional não encontrado.', 404);
    }

    const siglaUpper = sigla.toUpperCase();
    const siglaExists = await this.conselhosProfissionaisRepository.findBySigla(
      siglaUpper
    );

    if (siglaExists && siglaExists.id !== id) {
      throw new AppError('Já existe um Conselho Profissional com esta sigla.');
    }

    conselho.sigla = siglaUpper;
    conselho.nome = nome;

    await this.conselhosProfissionaisRepository.save(conselho);

    return conselho;
  }
} 