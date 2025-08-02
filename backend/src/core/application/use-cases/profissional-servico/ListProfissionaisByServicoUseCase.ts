import { injectable, inject } from 'tsyringe';
import { IProfissionaisRepository, ProfissionalServico } from '../../../domain/repositories/IProfissionaisRepository';

interface ListProfissionaisByServicoRequest {
  servicoId: string;
}

@injectable()
export class ListProfissionaisByServicoUseCase {
  constructor(
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository,
  ) {}

  async execute({ servicoId }: ListProfissionaisByServicoRequest): Promise<ProfissionalServico[]> {
    return await this.profissionaisRepository.listProfissionaisByServico(servicoId);
  }
}