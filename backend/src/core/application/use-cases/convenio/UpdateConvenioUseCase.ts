import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Convenio } from '../../../domain/entities/Convenio';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';

interface IRequest {
  id: string;
  nome: string;
}

@injectable()
export class UpdateConvenioUseCase {
  constructor(
    @inject('ConveniosRepository')
    private conveniosRepository: IConveniosRepository
  ) {}

  async execute({ id, nome }: IRequest): Promise<Convenio> {
    const convenio = await this.conveniosRepository.findById(id);

    if (!convenio) {
      throw new AppError('Convênio não encontrado.', 404);
    }

    const convenioComMesmoNome = await this.conveniosRepository.findByName(nome);

    if (convenioComMesmoNome && convenioComMesmoNome.id !== id) {
      throw new AppError('Já existe um convênio com este nome.');
    }

    convenio.nome = nome;

    await this.conveniosRepository.save(convenio);

    return convenio;
  }
} 