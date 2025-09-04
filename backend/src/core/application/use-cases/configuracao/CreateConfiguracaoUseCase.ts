import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Configuracao } from '../../../domain/entities/Configuracao';
import { IConfiguracoesRepository } from '../../../domain/repositories/IConfiguracoesRepository';

interface IRequest {
  entidadeTipo: string;
  entidadeId?: string | null;
  contexto: string;
  chave: string;
  valor: string;
  tipoValor?: string;
  descricao?: string | null;
  ativo?: boolean;
}

@injectable()
export class CreateConfiguracaoUseCase {
  constructor(
    @inject('ConfiguracoesRepository')
    private configuracoesRepository: IConfiguracoesRepository
  ) {}

  async execute(data: IRequest): Promise<Configuracao> {
    // Verificar se já existe configuração com a mesma chave
    const configuracaoExists = await this.configuracoesRepository.findByKey(
      data.entidadeTipo,
      data.entidadeId || null,
      data.contexto,
      data.chave
    );

    if (configuracaoExists) {
      throw new AppError('Configuração com esta chave já existe para esta entidade e contexto.');
    }

    // Validar tipo de valor se fornecido
    if (data.tipoValor && !['string', 'number', 'boolean', 'json', 'date'].includes(data.tipoValor)) {
      throw new AppError('Tipo de valor inválido. Use: string, number, boolean, json ou date.');
    }

    const configuracao = await this.configuracoesRepository.create({
      entidadeTipo: data.entidadeTipo,
      entidadeId: data.entidadeId,
      contexto: data.contexto,
      chave: data.chave,
      valor: data.valor,
      tipoValor: data.tipoValor || 'string',
      descricao: data.descricao,
      ativo: data.ativo ?? true,
    });

    return configuracao;
  }
}