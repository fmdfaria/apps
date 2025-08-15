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
  percentualClinica?: number | null;
  percentualProfissional?: number | null;
  valorClinica?: number | null;
  valorProfissional?: number | null;
  procedimentoPrimeiroAtendimento?: string;
  procedimentoDemaisAtendimentos?: string;
  convenioId?: string;
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
    valorClinica,
    valorProfissional,
    procedimentoPrimeiroAtendimento,
    procedimentoDemaisAtendimentos,
    convenioId,
  }: IRequest): Promise<Servico> {
    const servicoExists = await this.servicosRepository.findByNameAndDuration(nome, duracaoMinutos);

    if (servicoExists) {
      throw new AppError('Já existe um serviço com este nome e duração.');
    }

    if (convenioId) {
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
      valorClinica,
      valorProfissional,
      procedimentoPrimeiroAtendimento,
      procedimentoDemaisAtendimentos,
      convenioId,
    });

    return servico;
  }
} 