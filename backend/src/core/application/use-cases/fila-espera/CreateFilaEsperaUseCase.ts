import { inject, injectable } from 'tsyringe';
import { FilaEspera } from '../../../domain/entities/FilaEspera';
import { IFilaEsperaRepository } from '../../../domain/repositories/IFilaEsperaRepository';

interface IRequest {
  pacienteId: string;
  servicoId: string;
  profissionalId?: string | null;
  horarioPreferencia: string;
  observacao?: string | null;
  status?: string | null;
  ativo?: boolean;
}

@injectable()
export class CreateFilaEsperaUseCase {
  constructor(
    @inject('FilaEsperaRepository')
    private filaEsperaRepository: IFilaEsperaRepository
  ) {}

  async execute(data: IRequest): Promise<FilaEspera> {
    const created = await this.filaEsperaRepository.create({
      pacienteId: data.pacienteId,
      servicoId: data.servicoId,
      profissionalId: data.profissionalId ?? null,
      horarioPreferencia: data.horarioPreferencia,
      observacao: data.observacao ?? null,
      status: data.status ?? undefined,
      ativo: data.ativo ?? true,
    });
    return created;
  }
}


