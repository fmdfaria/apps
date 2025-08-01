import { inject, injectable } from 'tsyringe';
import { Banco } from '../../../domain/entities/Banco';
import { IBancosRepository } from '../../../domain/repositories/IBancosRepository';

@injectable()
export class ListBancosUseCase {
  constructor(
    @inject('BancosRepository')
    private bancosRepository: IBancosRepository
  ) {}

  async execute(): Promise<Banco[]> {
    const bancos = await this.bancosRepository.findAll();
    return bancos;
  }
}