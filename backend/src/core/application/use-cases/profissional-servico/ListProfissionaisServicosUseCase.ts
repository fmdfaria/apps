import { injectable, inject } from 'tsyringe';
import { IProfissionaisRepository, ProfissionalServico } from '../../../domain/repositories/IProfissionaisRepository';

@injectable()
export class ListProfissionaisServicosUseCase {
  constructor(
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository,
  ) {}

  async execute(): Promise<ProfissionalServico[]> {
    return await this.profissionaisRepository.listProfissionaisServicos();
  }
}