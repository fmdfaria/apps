import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Servico } from '../../../domain/entities/Servico';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';

interface IRequest {
  nome: string;
  descricao?: string;
  duracaoMinutos: number;
  preco: number;
  percentualClinica?: number;
  percentualProfissional?: number;
  procedimentoPrimeiroAtendimento?: string;
  procedimentoDemaisAtendimentos?: string;
  conveniosIds: string[];
}

@injectable()
export class CreateServicoUseCase {
  constructor(
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository,
    @inject('ConveniosRepository')
    private conveniosRepository: IConveniosRepository
  ) {}

  async execute({
    nome,
    descricao,
    duracaoMinutos,
    preco,
    percentualClinica,
    percentualProfissional,
    procedimentoPrimeiroAtendimento,
    procedimentoDemaisAtendimentos,
    conveniosIds,
  }: IRequest): Promise<Servico> {
    const servicoExists = await this.servicosRepository.findByNameAndDuration(nome, duracaoMinutos);

    if (servicoExists) {
      throw new AppError('Já existe um serviço com este nome e duração.');
    }

    for (const convenioId of conveniosIds) {
      const convenio = await this.conveniosRepository.findById(convenioId);
      if (!convenio) {
        throw new AppError(`Convênio com ID ${convenioId} não encontrado.`, 404);
      }
    }

    const servico = await this.servicosRepository.create({
      nome,
      descricao,
      duracaoMinutos,
      preco,
      percentualClinica,
      percentualProfissional,
      procedimentoPrimeiroAtendimento,
      procedimentoDemaisAtendimentos,
      conveniosIds,
    });

    return servico;
  }
} 