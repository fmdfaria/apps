import { inject, injectable } from 'tsyringe';
import { Convenio } from '../../../domain/entities/Convenio';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';

@injectable()
export class ListConveniosUseCase {
  constructor(
    @inject('ConveniosRepository')
    private conveniosRepository: IConveniosRepository
  ) {}

  async execute(): Promise<Convenio[]> {
    const convenios = await this.conveniosRepository.findAll();
    return convenios;
  }
} 