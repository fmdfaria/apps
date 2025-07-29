import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { PrecosServicosProfissionais } from '../../../domain/entities/PrecosServicosProfissionais';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';
import {
  IPrecosServicosProfissionaisRepository,
  ICreatePrecoServicoProfissionalDTO,
} from '../../../domain/repositories/IPrecosServicosProfissionaisRepository';

@injectable()
export class CreatePrecoServicoProfissionalUseCase {
  constructor(
    @inject('PrecosServicosProfissionaisRepository')
    private precosRepository: IPrecosServicosProfissionaisRepository,
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository,
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository
  ) {}

  async execute(
    data: ICreatePrecoServicoProfissionalDTO
  ): Promise<PrecosServicosProfissionais> {
    const { profissionalId, servicoId, precoClinica, precoProfissional } = data;

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

    const [profissional, servico, precoExists] = await Promise.all([
      this.profissionaisRepository.findById(profissionalId),
      this.servicosRepository.findById(servicoId),
      this.precosRepository.findByProfissionalAndServico(
        profissionalId,
        servicoId
      ),
    ]);

    if (!profissional) {
      throw new AppError('Profissional não encontrado.', 404);
    }

    if (!servico) {
      throw new AppError('Serviço não encontrado.', 404);
    }

    if (precoExists) {
      throw new AppError(
        'Já existe um preço cadastrado para este profissional e serviço.',
        409
      );
    }

    const preco = await this.precosRepository.create(data);

    return preco;
  }
} 