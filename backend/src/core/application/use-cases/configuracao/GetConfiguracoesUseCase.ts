import { inject, injectable } from 'tsyringe';
import { Configuracao } from '../../../domain/entities/Configuracao';
import { IConfiguracoesRepository } from '../../../domain/repositories/IConfiguracoesRepository';

interface IRequest {
  entidadeTipo: string;
  entidadeId?: string | null;
  contexto?: string;
}

@injectable()
export class GetConfiguracoesUseCase {
  constructor(
    @inject('ConfiguracoesRepository')
    private configuracoesRepository: IConfiguracoesRepository
  ) {}

  async execute(data: IRequest): Promise<Record<string, any>> {
    const configuracoes = await this.configuracoesRepository.findByEntity({
      entidadeTipo: data.entidadeTipo,
      entidadeId: data.entidadeId,
      contexto: data.contexto,
    });

    // Converter para objeto chave-valor para facilitar o uso
    const result: Record<string, any> = {};

    configuracoes.forEach(config => {
      let valor = config.valor;

      // Converter valor baseado no tipo
      try {
        switch (config.tipoValor) {
          case 'boolean':
            valor = config.valor.toLowerCase() === 'true';
            break;
          case 'number':
            valor = Number(config.valor);
            break;
          case 'json':
            valor = JSON.parse(config.valor);
            break;
          case 'date':
            valor = new Date(config.valor);
            break;
          default:
            valor = config.valor;
        }
      } catch (error) {
        // Se falhar na conversão, manter como string
        valor = config.valor;
      }

      result[config.chave] = valor;
    });

    return result;
  }
}