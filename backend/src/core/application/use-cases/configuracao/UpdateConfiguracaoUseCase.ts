import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Configuracao } from '../../../domain/entities/Configuracao';
import { IConfiguracoesRepository } from '../../../domain/repositories/IConfiguracoesRepository';

interface IRequest {
  id: string;
  entidadeTipo?: string;
  entidadeId?: string | null;
  contexto?: string;
  chave?: string;
  valor?: string;
  tipoValor?: string;
  descricao?: string | null;
  ativo?: boolean;
}

@injectable()
export class UpdateConfiguracaoUseCase {
  constructor(
    @inject('ConfiguracoesRepository')
    private configuracoesRepository: IConfiguracoesRepository
  ) {}

  async execute(data: IRequest): Promise<Configuracao> {
    const configuracao = await this.configuracoesRepository.findById(data.id);

    if (!configuracao) {
      throw new AppError('Configuração não encontrada.', 404);
    }

    // Se estiver alterando chave/contexto/entidade, verificar se não existe duplicação
    if (
      (data.entidadeTipo && data.entidadeTipo !== configuracao.entidadeTipo) ||
      (data.entidadeId !== undefined && data.entidadeId !== configuracao.entidadeId) ||
      (data.contexto && data.contexto !== configuracao.contexto) ||
      (data.chave && data.chave !== configuracao.chave)
    ) {
      const existingConfig = await this.configuracoesRepository.findByKey(
        data.entidadeTipo || configuracao.entidadeTipo,
        data.entidadeId !== undefined ? data.entidadeId : configuracao.entidadeId,
        data.contexto || configuracao.contexto,
        data.chave || configuracao.chave
      );

      if (existingConfig && existingConfig.id !== configuracao.id) {
        throw new AppError('Configuração com esta chave já existe para esta entidade e contexto.');
      }
    }

    // Validar tipo de valor se fornecido
    if (data.tipoValor && !['string', 'number', 'boolean', 'json', 'date'].includes(data.tipoValor)) {
      throw new AppError('Tipo de valor inválido. Use: string, number, boolean, json ou date.');
    }

    // Atualizar campos
    if (data.entidadeTipo !== undefined) configuracao.entidadeTipo = data.entidadeTipo;
    if (data.entidadeId !== undefined) configuracao.entidadeId = data.entidadeId;
    if (data.contexto !== undefined) configuracao.contexto = data.contexto;
    if (data.chave !== undefined) configuracao.chave = data.chave;
    if (data.valor !== undefined) configuracao.valor = data.valor;
    if (data.tipoValor !== undefined) configuracao.tipoValor = data.tipoValor;
    if (data.descricao !== undefined) configuracao.descricao = data.descricao;
    if (data.ativo !== undefined) configuracao.ativo = data.ativo;

    const updated = await this.configuracoesRepository.save(configuracao);
    return updated;
  }
}