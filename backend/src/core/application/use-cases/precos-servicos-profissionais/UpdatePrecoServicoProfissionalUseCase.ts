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

    if (
      precoClinica !== null &&
      precoClinica !== undefined &&
      precoProfissional !== null &&
      precoProfissional !== undefined
    ) {
      if (precoClinica + precoProfissional !== 100) {
        throw new AppError(
          'A soma dos percentuais da clínica e do profissional deve ser 100.'
        );
      }
    }

    // Impede a alteração das chaves estrangeiras
    if (data.profissionalId || data.servicoId) {
      throw new AppError(
        'Não é permitido alterar o profissional ou o serviço de um preço existente.'
      );
    }

    const updatedPreco = await this.precosRepository.update(id, data);

    return updatedPreco;
  }
} 