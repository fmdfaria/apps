import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Profissional } from '../../../domain/entities/Profissional';
import { IConselhosProfissionaisRepository } from '../../../domain/repositories/IConselhosProfissionaisRepository';
import { IEspecialidadesRepository } from '../../../domain/repositories/IEspecialidadesRepository';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';
import { ICreateProfissionalDTO } from '../../../domain/repositories/IProfissionaisRepository';

@injectable()
export class CreateProfissionalUseCase {
  constructor(
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository,
    @inject('ConselhosProfissionaisRepository')
    private conselhosRepository: IConselhosProfissionaisRepository,
    @inject('EspecialidadesRepository')
    private especialidadesRepository: IEspecialidadesRepository,
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository
  ) {}

  async execute(data: ICreateProfissionalDTO): Promise<Profissional> {
    if (!data.cpf) {
      throw new AppError('CPF é obrigatório.');
    }
    const [cpfExists, emailExists] = await Promise.all([
      this.profissionaisRepository.findByCpf(data.cpf),
      this.profissionaisRepository.findByEmail(data.email),
    ]);

    if (cpfExists) {
      throw new AppError('CPF já cadastrado.');
    }

    if (emailExists) {
      throw new AppError('E-mail já cadastrado.');
    }

    if (data.conselhoId) {
      const conselho = await this.conselhosRepository.findById(data.conselhoId);
      if (!conselho) {
        throw new AppError('Conselho profissional não encontrado.', 404);
      }
    }

    for (const especialidadeId of data.especialidadesIds) {
      const especialidade = await this.especialidadesRepository.findById(
        especialidadeId
      );
      if (!especialidade) {
        throw new AppError(
          `Especialidade com ID ${especialidadeId} não encontrada.`,
          404
        );
      }
    }

    const servicosIds = Array.isArray(data.servicosIds) ? data.servicosIds : [];
    for (const servicoId of servicosIds) {
      const servico = await this.servicosRepository.findById(servicoId);
      if (!servico) {
        throw new AppError(`Serviço com ID ${servicoId} não encontrado.`, 404);
      }
    }

    console.log('DATA PARA CRIAÇÃO:', data);

    const profissional = await this.profissionaisRepository.create(data);

    return profissional;
  }
} 