import { inject, injectable } from 'tsyringe';
import { Configuracao } from '../../../domain/entities/Configuracao';
import { IConfiguracoesRepository } from '../../../domain/repositories/IConfiguracoesRepository';

@injectable()
export class ListConfiguracaoUseCase {
  constructor(
    @inject('ConfiguracoesRepository')
    private configuracoesRepository: IConfiguracoesRepository
  ) {}

  async execute(): Promise<Configuracao[]> {
    const configuracoes = await this.configuracoesRepository.findAll();
    return configuracoes;
  }
}