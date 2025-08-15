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
    
    // Auto-calcular os percentuais baseado nos valores diretos
    let percentualClinica: number | null = null;
    let percentualProfissional: number | null = null;

    // Validação removida: agora precoClinica e precoProfissional são valores diretos em R$, não percentuais

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

    // Se foram fornecidos valores diretos, calcular os percentuais
    if (precoClinica !== null && precoClinica !== undefined && 
        precoProfissional !== null && precoProfissional !== undefined) {
      const total = precoClinica + precoProfissional;
      if (total > 0) {
        percentualClinica = Number(((precoClinica / total) * 100).toFixed(2));
        percentualProfissional = Number(((precoProfissional / total) * 100).toFixed(2));
      }
    }
    
    const preco = await this.precosRepository.create({
      ...data,
      percentualClinica,
      percentualProfissional
    });

    return preco;
  }
} 