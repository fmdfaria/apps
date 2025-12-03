import { inject, injectable } from 'tsyringe';
import { IAgendamentosRepository } from '../../../domain/repositories/IAgendamentosRepository';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';

interface FaltaData {
  agendamentoId: string;
  dataHoraInicio: Date;
  servicoNome: string;
  profissionalNome: string;
  convenioNome: string;
}

interface PacienteComFaltas {
  pacienteId: string;
  pacienteNome: string;
  pacienteWhatsapp: string;
  faltasConsecutivas: number;
  totalFaltas: number;
  ultimaFalta: Date;
  faltas: FaltaData[];
  profissionalNome: string; // Do último agendamento faltoso
  convenioNome: string; // Do último agendamento faltoso
  servicoNome: string; // Do último agendamento faltoso
}

@injectable()
export class GetPacientesComFaltasConsecutivasUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    @inject('PacientesRepository')
    private pacientesRepository: IPacientesRepository
  ) {}

  async execute(): Promise<PacienteComFaltas[]> {
    // Step 1: Get ALL agendamentos (no filters - we'll filter manually)
    const result = await this.agendamentosRepository.findAll({
      limit: 999999, // Remove pagination to get all records
      orderBy: 'dataHoraInicio',
      orderDirection: 'asc'
    });

    const todosAgendamentos = result.data;

    // Step 2: Filter only absences (compareceu = false)
    const agendamentosFaltas = todosAgendamentos.filter(
      ag => ag.compareceu === false
    );

    // Step 3: Group by patient
    const faltasPorPaciente = new Map<string, typeof agendamentosFaltas>();

    agendamentosFaltas.forEach(ag => {
      const pacienteId = ag.pacienteId;
      if (!faltasPorPaciente.has(pacienteId)) {
        faltasPorPaciente.set(pacienteId, []);
      }
      faltasPorPaciente.get(pacienteId)!.push(ag);
    });

    // Step 4: Process each patient's absences
    const pacientesComFaltas: PacienteComFaltas[] = [];

    for (const [pacienteId, faltas] of faltasPorPaciente.entries()) {
      // Sort by date ascending
      const faltasOrdenadas = [...faltas].sort((a, b) =>
        new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime()
      );

      // Calculate consecutive streak from the END (most recent)
      let faltasConsecutivas = 0;

      // Get ALL agendamentos for this patient to check if absences are consecutive
      const todosAgendamentosPaciente = todosAgendamentos
        .filter(ag => ag.pacienteId === pacienteId)
        .sort((a, b) =>
          new Date(b.dataHoraInicio).getTime() - new Date(a.dataHoraInicio).getTime()
        ); // Sort descending (most recent first)

      // Count consecutive absences from most recent
      for (const ag of todosAgendamentosPaciente) {
        if (ag.compareceu === false) {
          faltasConsecutivas++;
        } else if (ag.compareceu === true) {
          // Stop counting when we hit an attendance
          break;
        }
        // compareceu === null doesn't break the streak nor count
      }

      // Only include patients with 2+ consecutive absences
      if (faltasConsecutivas >= 2) {
        const paciente = await this.pacientesRepository.findById(pacienteId);

        if (!paciente) continue;

        // Get data from the most recent absence
        const ultimaFalta = faltasOrdenadas[faltasOrdenadas.length - 1];

        pacientesComFaltas.push({
          pacienteId,
          pacienteNome: paciente.nomeCompleto,
          pacienteWhatsapp: paciente.whatsapp || '',
          faltasConsecutivas,
          totalFaltas: faltasOrdenadas.length, // NEVER resets - lifetime total
          ultimaFalta: new Date(ultimaFalta.dataHoraInicio),
          faltas: faltasOrdenadas.map(f => ({
            agendamentoId: f.id!,
            dataHoraInicio: new Date(f.dataHoraInicio),
            servicoNome: f.servico?.nome || 'N/A',
            profissionalNome: f.profissional?.nome || 'N/A',
            convenioNome: f.convenio?.nome || 'Particular'
          })),
          profissionalNome: ultimaFalta.profissional?.nome || 'N/A',
          convenioNome: ultimaFalta.convenio?.nome || 'Particular',
          servicoNome: ultimaFalta.servico?.nome || 'N/A'
        });
      }
    }

    // Sort by consecutive absences descending (most concerning first)
    return pacientesComFaltas.sort((a, b) => b.faltasConsecutivas - a.faltasConsecutivas);
  }
}
