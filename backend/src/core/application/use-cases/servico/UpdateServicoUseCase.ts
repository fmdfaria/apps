import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Servico } from '../../../domain/entities/Servico';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';

interface IRequest {
  id: string;
  nome: string;
  descricao?: string;
  duracaoMinutos: number;
  preco: number;
  percentualClinica?: number | null;
  percentualProfissional?: number | null;
  valorClinica?: number | null;
  valorProfissional?: number | null;
  procedimentoPrimeiroAtendimento?: string;
  procedimentoDemaisAtendimentos?: string;
  convenioId?: string;
}

@injectable()
export class UpdateServicoUseCase {
  constructor(
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository,
    @inject('ConveniosRepository')
    private conveniosRepository: IConveniosRepository
  ) {}

  async execute(data: IRequest): Promise<Servico> {
    const servico = await this.servicosRepository.findById(data.id);

    if (!servico) {
      throw new AppError('Serviço não encontrado.', 404);
    }

    const servicoComMesmoNomeDuracao = await this.servicosRepository.findByNameAndDuration(
      data.nome,
      data.duracaoMinutos
    );

    if (servicoComMesmoNomeDuracao && servicoComMesmoNomeDuracao.id !== data.id) {
      throw new AppError('Já existe um serviço com este nome e duração.');
    }

    if (data.convenioId) {
      const convenio = await this.conveniosRepository.findById(data.convenioId);
      if (!convenio) {
        throw new AppError(`Convênio com ID ${data.convenioId} não encontrado.`, 404);
      }
    }

    Object.assign(servico, data);

    const updatedServico = await this.servicosRepository.save(servico);

    return updatedServico;
  }
} 