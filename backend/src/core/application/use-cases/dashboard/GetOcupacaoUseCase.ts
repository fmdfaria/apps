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
  ocupados: number;
  total: number;
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
      this.agendamentosRepository.findAll({ dataInicio: hoje, dataFim: proximosSete }),
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

    // Debug final - verificar se os dados estão corretos antes de retornar
    console.log('[DEBUG] Retornando ocupações - primeiro recurso:', JSON.stringify(ocupacoesRecursos[0], null, 2));

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

        // 3. Calcular slots: somar disponibilidades e subtrair folgas
        let slotsDisponiveisNoDia = 0;
        let slotsFolgaNoDia = 0;
        
        disponibilidadesDoDia.forEach(d => {
          const horaInicio = d.horaInicio.getHours() * 60 + d.horaInicio.getMinutes();
          const horaFim = d.horaFim.getHours() * 60 + d.horaFim.getMinutes();
          const slotsNoPeriodo = (horaFim - horaInicio) / 30; // Slots de 30 min
          
          if (d.tipo === 'presencial' || d.tipo === 'online') {
            slotsDisponiveisNoDia += slotsNoPeriodo;
          } else if (d.tipo === 'folga') {
            slotsFolgaNoDia += slotsNoPeriodo;
          }
        });
        
        // Saldo final: disponibilidades - folgas (não pode ser negativo)
        const slotsLiquidosNoDia = Math.max(0, slotsDisponiveisNoDia - slotsFolgaNoDia);
        totalSlotsDisponiveis += slotsLiquidosNoDia;
        
        // Debug para Luana
        if (profissional.nome.includes('Luana de Fátima')) {
          console.log(`[DEBUG] ${dia.toISOString().split('T')[0]}: disponíveis=${slotsDisponiveisNoDia}, folga=${slotsFolgaNoDia}, líquido=${slotsLiquidosNoDia}, total acumulado=${totalSlotsDisponiveis}`);
          console.log(`[DEBUG] ${dia.toISOString().split('T')[0]}: ${disponibilidadesDoDia.length} disponibilidades encontradas:`, disponibilidadesDoDia.map(d => `${d.tipo} ${d.horaInicio}-${d.horaFim} ${d.dataEspecifica ? 'específica' : 'semanal'}`));
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

      // Debug detalhado para Luana
      if (profissional.nome.includes('Luana de Fátima')) {
        console.log(`[DEBUG LUANA FINAL] Agendamentos: ${ocupadosReais}, Slots totais: ${totalSlotsDisponiveis}, Percentual: ${percentualReal}%`);
      }

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
      
      // Calcular slots fixos baseados no horário de funcionamento da clínica
      let totalSlotsDisponiveis = 0;
      
      for (let i = 0; i < 7; i++) {
        const dia = new Date(dataInicio);
        dia.setDate(dia.getDate() + i);
        const diaSemana = dia.getDay(); // 0=domingo, 1=segunda, ..., 6=sábado
        
        if (diaSemana >= 1 && diaSemana <= 5) {
          // Segunda a sexta: 07:30 às 20:00 = 12.5 horas = 25 slots de 30min
          totalSlotsDisponiveis += 25;
        } else if (diaSemana === 6) {
          // Sábado: 08:00 às 13:00 = 5 horas = 10 slots de 30min
          totalSlotsDisponiveis += 10;
        }
        // Domingo: 0 slots (não funciona)
      }
      
      const percentualOcupacao = totalSlotsDisponiveis > 0 
        ? Math.min(100, Math.round((agendamentosRecursoProx7.length / totalSlotsDisponiveis) * 100))
        : 0;

      // Debug para recursos
      console.log(`[DEBUG RECURSO] ${recurso.nome}: ocupados=${agendamentosRecursoProx7.length}, total=${totalSlotsDisponiveis}, percentual=${percentualOcupacao}%`);

      return {
        id: recurso.id,
        nome: recurso.nome,
        tipo: recurso.tipo || 'Consultório',
        agendamentosHoje: agendamentosRecursoHoje.length,
        agendamentosProximos7: agendamentosRecursoProx7.length,
        percentualOcupacao,
        disponivel: true,
        ocupados: agendamentosRecursoProx7.length,
        total: totalSlotsDisponiveis
      };
    });
  }
}