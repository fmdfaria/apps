import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { PrecosServicosProfissionais } from '../../../domain/entities/PrecosServicosProfissionais';
import {
  IPrecosServicosProfissionaisRepository,
  IUpdatePrecoServicoProfissionalDTO,
} from '../../../domain/repositories/IPrecosServicosProfissionaisRepository';

@injectable()
export class UpdatePrecoServicoProfissionalUseCase {
  constructor(
    @inject('PrecosServicosProfissionaisRepository')
    private precosRepository: IPrecosServicosProfissionaisRepository
  ) {}

  async execute({
    id,
    ...data
  }: IUpdatePrecoServicoProfissionalDTO & { id: string }): Promise<PrecosServicosProfissionais> {
    const preco = await this.precosRepository.findById(id);

    if (!preco) {
      throw new AppError('Preço não encontrado.', 404);
    }

    const precoClinica =
      data.precoClinica !== undefined ? data.precoClinica : preco.precoClinica;
    const precoProfissional =
      data.precoProfissional !== undefined
        ? data.precoProfissional
        : preco.precoProfissional;
    
    // Auto-calcular os percentuais baseado nos valores diretos
    let percentualClinica: number | null = null;
    let percentualProfissional: number | null = null;
    
    // Auto-calcular os percentuais baseado nos valores diretos (se fornecidos)
    if (precoClinica !== null && precoClinica !== undefined && 
        precoProfissional !== null && precoProfissional !== undefined) {
      const total = precoClinica + precoProfissional;
      if (total > 0) {
        percentualClinica = Number(((precoClinica / total) * 100).toFixed(2));
        percentualProfissional = Number(((precoProfissional / total) * 100).toFixed(2));
      }
    } else {
      // Se os percentuais foram fornecidos diretamente, usar eles
      percentualClinica = data.percentualClinica !== undefined ? data.percentualClinica : preco.percentualClinica;
      percentualProfissional = data.percentualProfissional !== undefined ? data.percentualProfissional : preco.percentualProfissional;
    }

    // Impede a alteração das chaves estrangeiras
    if (data.profissionalId || data.servicoId) {
      throw new AppError(
        'Não é permitido alterar o profissional ou o serviço de um preço existente.'
      );
    }

    const updatedPreco = await this.precosRepository.update(id, {
      ...data,
      percentualClinica,
      percentualProfissional
    });

    return updatedPreco;
  }
} 