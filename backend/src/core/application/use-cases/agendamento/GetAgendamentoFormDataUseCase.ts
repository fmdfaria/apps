import { injectable, inject } from 'tsyringe';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';
import { IRecursosRepository } from '../../../domain/repositories/IRecursosRepository';
import { IDisponibilidadesProfissionaisRepository } from '../../../domain/repositories/IDisponibilidadesProfissionaisRepository';
import { IAgendamentosRepository } from '../../../domain/repositories/IAgendamentosRepository';

interface IRequest {
  data?: string; // Data no formato YYYY-MM-DD (opcional)
  profissionalId?: string; // ID do profissional (opcional)
}

interface IOcupacaoSemanal {
  profissionalId: string;
  ocupados: number;
  total: number;
  percentual: number;
}

interface IAgendamentoFormDataResponse {
  pacientes: any[];
  profissionais: any[];
  convenios: any[];
  servicos: any[];
  recursos: any[];
  disponibilidades: any[];
  agendamentos: any[];
  ocupacoesSemana: IOcupacaoSemanal[];
}

@injectable()
export class GetAgendamentoFormDataUseCase {
  constructor(
    @inject('PacientesRepository')
    private pacientesRepository: IPacientesRepository,
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository,
    @inject('ConveniosRepository')
    private conveniosRepository: IConveniosRepository,
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository,
    @inject('RecursosRepository')
    private recursosRepository: IRecursosRepository,
    @inject('DisponibilidadesProfissionaisRepository')
    private disponibilidadesRepository: IDisponibilidadesProfissionaisRepository,
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository
  ) {}

  async execute({ data, profissionalId }: IRequest): Promise<IAgendamentoFormDataResponse> {
    // Buscar todos os dados base (sempre necessários)
    const [pacientes, profissionais, convenios, servicos, recursos] = await Promise.all([
      this.pacientesRepository.findAll(),
      this.profissionaisRepository.findAll(),
      this.conveniosRepository.findAll(),
      this.servicosRepository.findAll(),
      this.recursosRepository.findAll()
    ]);

    let disponibilidades: any[] = [];
    let agendamentos: any[] = [];
    let ocupacoesSemana: IOcupacaoSemanal[] = [];

    // Se data foi fornecida, buscar dados específicos da data
    if (data) {
      const dataInicio = new Date(`${data}T00:00:00.000Z`);
      const dataFim = new Date(`${data}T23:59:59.999Z`);

      // Buscar agendamentos da data (usar range correto e extrair lista do retorno paginado)
      const agendamentosResp = await this.agendamentosRepository.findAll({
        dataInicio,
        dataFim,
        limit: 1000,
      });
      agendamentos = Array.isArray((agendamentosResp as any)?.data)
        ? (agendamentosResp as any).data
        : Array.isArray(agendamentosResp as any)
          ? (agendamentosResp as any)
          : [];

      // Buscar disponibilidades (todos os profissionais)
      disponibilidades = await this.disponibilidadesRepository.findAll();

      // Calcular ocupação semanal para todos os profissionais
      try {
        ocupacoesSemana = await this.calcularOcupacoesSemana(profissionais, data);
      } catch (error) {
        console.error('Erro ao calcular ocupações semanais:', error);
        ocupacoesSemana = [];
      }
    }

    // Se profissionalId foi fornecido, filtrar dados específicos
    if (profissionalId) {
      // Filtrar dados relacionados ao profissional específico
      disponibilidades = Array.isArray(disponibilidades)
        ? disponibilidades.filter(d => d.profissionalId === profissionalId)
        : [];
      agendamentos = Array.isArray(agendamentos)
        ? agendamentos.filter(a => a.profissionalId === profissionalId)
        : [];
    }

    return {
      pacientes: pacientes.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR')),
      profissionais: profissionais.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      convenios: convenios.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      servicos: servicos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      recursos: recursos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      disponibilidades,
      agendamentos,
      ocupacoesSemana
    };
  }

  private async calcularOcupacoesSemana(profissionais: any[], data: string): Promise<IOcupacaoSemanal[]> {
    const dataObj = new Date(`${data}T12:00:00.000Z`);
    
    // Calcular primeiro e último dia da semana (segunda a domingo)
    const inicioDaSemana = new Date(dataObj);
    const diaSemana = inicioDaSemana.getDay();
    const diasParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
    inicioDaSemana.setDate(inicioDaSemana.getDate() + diasParaSegunda);
    inicioDaSemana.setHours(0, 0, 0, 0);

    const fimDaSemana = new Date(inicioDaSemana);
    fimDaSemana.setDate(fimDaSemana.getDate() + 6);
    fimDaSemana.setHours(23, 59, 59, 999);

    // Buscar disponibilidades e agendamentos da semana (usar range e extrair lista do retorno paginado)
    const [disponibilidades, agendamentosResp] = await Promise.all([
      this.disponibilidadesRepository.findAll(),
      this.agendamentosRepository.findAll({ dataInicio: inicioDaSemana, dataFim: fimDaSemana, limit: 10000 })
    ]);
    const agendamentos: any[] = Array.isArray((agendamentosResp as any)?.data)
      ? (agendamentosResp as any).data
      : Array.isArray(agendamentosResp as any)
        ? (agendamentosResp as any)
        : [];

    const ocupacoes: IOcupacaoSemanal[] = [];

    for (const profissional of profissionais) {
      // Filtrar disponibilidades do profissional
      const disponibilidadesProfissional = disponibilidades.filter(d => d.profissionalId === profissional.id);
      
      // Calcular total de slots disponíveis na semana
      let totalSlotsDisponiveis = 0;
      
      for (let dia = new Date(inicioDaSemana); dia <= fimDaSemana; dia.setDate(dia.getDate() + 1)) {
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

      // Filtrar agendamentos do profissional na semana
      const agendamentosDaSemana = agendamentos.filter(agendamento => {
        if (agendamento.profissionalId !== profissional.id) return false;
        
        // Verificar status cancelado (excluir do cálculo)
        const statusCancelado = ['CANCELADO', 'cancelado', 'CANCELLED', 'cancelled'].includes(agendamento.status);
        if (statusCancelado) {
          return false;
        }
        
        const dataAgendamento = new Date(agendamento.dataHoraInicio);
        return dataAgendamento >= inicioDaSemana && dataAgendamento <= fimDaSemana;
      });

      // Calcular slots ocupados baseado na duração real de cada agendamento
      const slotsOcupados = agendamentosDaSemana.reduce((total, agendamento) => {
        let duracaoMinutos: number;
        
        if (agendamento.dataHoraFim) {
          // Se tem dataHoraFim, calcular duração real
          const inicio = new Date(agendamento.dataHoraInicio);
          const fim = new Date(agendamento.dataHoraFim);
          duracaoMinutos = (fim.getTime() - inicio.getTime()) / (1000 * 60); // Converter para minutos
        } else {
          // Se não tem dataHoraFim, usar duração padrão de 60 minutos
          duracaoMinutos = 60;
        }
        
        // Calcular quantos slots de 30 minutos esse agendamento ocupa
        const slotsDoAgendamento = Math.ceil(duracaoMinutos / 30); // Arredondar para cima
        
        return total + slotsDoAgendamento;
      }, 0);
      const percentual = totalSlotsDisponiveis === 0 ? 0 : Math.round((slotsOcupados / totalSlotsDisponiveis) * 100);
      
      ocupacoes.push({
        profissionalId: profissional.id,
        ocupados: slotsOcupados,
        total: totalSlotsDisponiveis,
        percentual
      });
    }

    return ocupacoes;
  }
}