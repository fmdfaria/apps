import { injectable, inject } from 'tsyringe';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import { IDisponibilidadesProfissionaisRepository } from '../../../domain/repositories/IDisponibilidadesProfissionaisRepository';
import { IAgendamentosRepository } from '../../../domain/repositories/IAgendamentosRepository';
import { IRecursosRepository } from '../../../domain/repositories/IRecursosRepository';

interface IOcupacaoProfissional {
  profissionalId: string;
  nome: string;
  ocupados: number;
  total: number;
  percentual: number;
  agendamentosHoje: number;
  agendamentosProximos7: number;
}

interface IOcupacaoRecurso {
  id: string;
  nome: string;
  tipo: string;
  agendamentosHoje: number;
  agendamentosProximos7: number;
  percentualOcupacao: number;
  disponivel: boolean;
}

interface IResponse {
  ocupacoesProfissionais: IOcupacaoProfissional[];
  ocupacoesRecursos: IOcupacaoRecurso[];
}

@injectable()
export class GetOcupacaoUseCase {
  constructor(
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository,
    @inject('DisponibilidadesProfissionaisRepository')
    private disponibilidadesRepository: IDisponibilidadesProfissionaisRepository,
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    @inject('RecursosRepository')
    private recursosRepository: IRecursosRepository
  ) {}

  async execute(): Promise<IResponse> {
    // Calcular período de 7 dias
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const proximosSete = new Date(hoje);
    proximosSete.setDate(proximosSete.getDate() + 7);
    proximosSete.setHours(23, 59, 59, 999);

    // Buscar dados necessários
    const [profissionais, disponibilidades, agendamentosResp, recursos] = await Promise.all([
      this.profissionaisRepository.findAll(),
      this.disponibilidadesRepository.findAll(),
      this.agendamentosRepository.findAll({ dataInicio: hoje, dataFim: proximosSete, limit: 10000 }),
      this.recursosRepository.findAll()
    ]);

    const agendamentos: any[] = Array.isArray((agendamentosResp as any)?.data)
      ? (agendamentosResp as any).data
      : Array.isArray(agendamentosResp as any)
        ? (agendamentosResp as any)
        : [];

    // Calcular ocupação dos profissionais
    const ocupacoesProfissionais = await this.calcularOcupacaoProfissionais(
      profissionais, 
      disponibilidades, 
      agendamentos, 
      hoje
    );

    // Calcular ocupação dos recursos (manter lógica atual)
    const ocupacoesRecursos = this.calcularOcupacaoRecursos(recursos, agendamentos, hoje);

    return {
      ocupacoesProfissionais,
      ocupacoesRecursos
    };
  }

  private async calcularOcupacaoProfissionais(
    profissionais: any[], 
    disponibilidades: any[], 
    agendamentos: any[],
    dataInicio: Date
  ): Promise<IOcupacaoProfissional[]> {
    const ocupacoes: IOcupacaoProfissional[] = [];

    for (const profissional of profissionais) {
      // Filtrar disponibilidades do profissional
      const disponibilidadesProfissional = disponibilidades.filter(d => d.profissionalId === profissional.id);
      
      // Calcular total de slots disponíveis nos próximos 7 dias
      let totalSlotsDisponiveis = 0;
      
      for (let i = 0; i < 7; i++) {
        const dia = new Date(dataInicio);
        dia.setDate(dia.getDate() + i);
        const diaSemanaNum = dia.getDay();
        
        // PRIORIDADE: Data específica tem prioridade sobre dia da semana
        // 1. Primeiro buscar disponibilidades específicas para este dia
        let disponibilidadesDoDia = disponibilidadesProfissional.filter(d => {
          if (d.dataEspecifica) {
            const dataDisp = new Date(d.dataEspecifica);
            return dataDisp.getDate() === dia.getDate() && 
                   dataDisp.getMonth() === dia.getMonth() && 
                   dataDisp.getFullYear() === dia.getFullYear();
          }
          return false;
        });

        // 2. Se não houver disponibilidades específicas, buscar por dia da semana
        if (disponibilidadesDoDia.length === 0) {
          disponibilidadesDoDia = disponibilidadesProfissional.filter(d => {
            return d.diaSemana === diaSemanaNum && !d.dataEspecifica;
          });
        }

        // 3. Verificar se há folga específica - se sim, não contar slots
        const temFolgaEspecifica = disponibilidadesDoDia.some(d => d.tipo === 'folga');
        
        if (!temFolgaEspecifica) {
          // Somar slots disponíveis (apenas presencial e online)
          disponibilidadesDoDia.forEach(d => {
            if (d.tipo === 'presencial' || d.tipo === 'online') {
              const horaInicio = d.horaInicio.getHours() * 60 + d.horaInicio.getMinutes();
              const horaFim = d.horaFim.getHours() * 60 + d.horaFim.getMinutes();
              const slotsNoPeriodo = (horaFim - horaInicio) / 30; // Slots de 30 min
              totalSlotsDisponiveis += slotsNoPeriodo;
            }
          });
        }
      }

      // Calcular agendamentos hoje
      const fimHoje = new Date(dataInicio);
      fimHoje.setDate(fimHoje.getDate() + 1);
      
      const agendamentosHoje = agendamentos.filter(agendamento => {
        if (agendamento.profissionalId !== profissional.id) return false;
        const dataAgendamento = new Date(agendamento.dataHoraInicio);
        return dataAgendamento >= dataInicio && dataAgendamento < fimHoje;
      });

      // Calcular agendamentos nos próximos 7 dias
      const agendamentosProximos7 = agendamentos.filter(agendamento => {
        if (agendamento.profissionalId !== profissional.id) return false;
        const dataAgendamento = new Date(agendamento.dataHoraInicio);
        const fimSete = new Date(dataInicio);
        fimSete.setDate(fimSete.getDate() + 7);
        return dataAgendamento >= dataInicio && dataAgendamento < fimSete;
      });

      const ocupadosReais = agendamentosProximos7.length;
      const percentualReal = totalSlotsDisponiveis > 0 ? Math.round((ocupadosReais / totalSlotsDisponiveis) * 100) : 0;

      ocupacoes.push({
        profissionalId: profissional.id,
        nome: profissional.nome,
        ocupados: ocupadosReais,
        total: totalSlotsDisponiveis,
        percentual: percentualReal,
        agendamentosHoje: agendamentosHoje.length,
        agendamentosProximos7: agendamentosProximos7.length
      });
    }

    return ocupacoes;
  }

  private calcularOcupacaoRecursos(
    recursos: any[], 
    agendamentos: any[],
    dataInicio: Date
  ): IOcupacaoRecurso[] {
    return recursos.map(recurso => {
      // Calcular agendamentos hoje
      const fimHoje = new Date(dataInicio);
      fimHoje.setDate(fimHoje.getDate() + 1);
      
      const agendamentosRecursoHoje = agendamentos.filter(ag => {
        if (ag.recursoId !== recurso.id) return false;
        const dataAgendamento = new Date(ag.dataHoraInicio);
        return dataAgendamento >= dataInicio && dataAgendamento < fimHoje;
      });

      // Calcular agendamentos nos próximos 7 dias
      const fimSete = new Date(dataInicio);
      fimSete.setDate(fimSete.getDate() + 7);
      
      const agendamentosRecursoProx7 = agendamentos.filter(ag => {
        if (ag.recursoId !== recurso.id) return false;
        const dataAgendamento = new Date(ag.dataHoraInicio);
        return dataAgendamento >= dataInicio && dataAgendamento < fimSete;
      });
      
      // Estimar ocupação baseada nos agendamentos (assumindo 8 slots por dia para recursos)
      const slotsDisponiveis = 7 * 8; // 7 dias × 8 slots por dia
      const percentualOcupacao = slotsDisponiveis > 0 
        ? Math.min(100, Math.round((agendamentosRecursoProx7.length / slotsDisponiveis) * 100))
        : 0;

      return {
        id: recurso.id,
        nome: recurso.nome,
        tipo: recurso.tipo || 'Consultório',
        agendamentosHoje: agendamentosRecursoHoje.length,
        agendamentosProximos7: agendamentosRecursoProx7.length,
        percentualOcupacao,
        disponivel: true
      };
    });
  }
}