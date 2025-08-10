import { injectable, inject } from 'tsyringe';
import { IRecursosRepository } from '../../../domain/repositories/IRecursosRepository';
import { IAgendamentosRepository } from '../../../domain/repositories/IAgendamentosRepository';

interface IRequest {
  data: string; // Data no formato YYYY-MM-DD
}

interface IResponse {
  id: string;
  nome: string;
  descricao?: string;
  agendamentos: Array<{
    id: string;
    pacienteNome?: string;
    horaInicio: string;
    horaFim: string;
    status: string;
  }>;
}

@injectable()
export class ListRecursosByDateUseCase {
  constructor(
    @inject('RecursosRepository')
    private recursosRepository: IRecursosRepository,
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository
  ) {}

  async execute({ data }: IRequest): Promise<IResponse[]> {
    // Buscar todos os recursos
    const recursos = await this.recursosRepository.findAll();
    
    // Converter a data string para Date objects para início e fim do dia
    const dataInicio = new Date(`${data}T00:00:00.000Z`);
    const dataFim = new Date(`${data}T23:59:59.999Z`);

    // Para cada recurso, buscar agendamentos na data especificada
    const recursosComAgendamentos: IResponse[] = await Promise.all(
      recursos.map(async (recurso) => {
        // Buscar agendamentos do recurso na data
        const agendamentos = await this.agendamentosRepository.findByRecursoAndDateRange(
          recurso.id,
          dataInicio,
          dataFim
        );

        return {
          id: recurso.id,
          nome: recurso.nome,
          descricao: recurso.descricao,
          agendamentos: agendamentos.map(agendamento => {
            const dataHoraInicio = new Date(agendamento.dataHoraInicio);
            
            // Calcular hora fim baseada na dataHoraFim se existir, senão assumir 30 minutos
            let dataHoraFim: Date;
            if (agendamento.dataHoraFim) {
              dataHoraFim = new Date(agendamento.dataHoraFim);
            } else {
              dataHoraFim = new Date(dataHoraInicio.getTime() + 30 * 60 * 1000); // 30 minutos
            }

            return {
              id: agendamento.id,
              pacienteNome: agendamento.pacienteNome,
              horaInicio: dataHoraInicio.toTimeString().substring(0, 5), // HH:MM
              horaFim: dataHoraFim.toTimeString().substring(0, 5), // HH:MM
              status: agendamento.status
            };
          })
        };
      })
    );

    return recursosComAgendamentos;
  }
}