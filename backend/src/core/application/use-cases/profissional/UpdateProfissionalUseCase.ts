import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Profissional } from '../../../domain/entities/Profissional';
import { IConselhosProfissionaisRepository } from '../../../domain/repositories/IConselhosProfissionaisRepository';
import { IEspecialidadesRepository } from '../../../domain/repositories/IEspecialidadesRepository';
import {
  IProfissionaisRepository,
  IUpdateProfissionalDTO,
} from '../../../domain/repositories/IProfissionaisRepository';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';

@injectable()
export class UpdateProfissionalUseCase {
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

  async execute({
    id,
    ...data
  }: IUpdateProfissionalDTO & { id: string }): Promise<Profissional> {
    const profissional = await this.profissionaisRepository.findById(id);

    if (!profissional) {
      throw new AppError('Profissional não encontrado.', 404);
    }

    if (data.email && data.email !== profissional.email) {
      const emailExists = await this.profissionaisRepository.findByEmail(
        data.email
      );
      if (emailExists && emailExists.id !== id) {
        throw new AppError('E-mail já cadastrado para outro profissional.');
      }
    }

    if (data.conselhoId) {
      const conselho = await this.conselhosRepository.findById(data.conselhoId);
      if (!conselho) {
        throw new AppError('Conselho profissional não encontrado.', 404);
      }
    }

    if (data.especialidadesIds) {
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
    }

    if (data.servicosIds) {
      for (const servicoId of data.servicosIds) {
        const servico = await this.servicosRepository.findById(servicoId);
        if (!servico) {
          throw new AppError(
            `Serviço com ID ${servicoId} não encontrado.`,
            404
          );
        }
      }
    }

    const updatedProfissional = await this.profissionaisRepository.update(
      id,
      data
    );

    return updatedProfissional;
  }
} 