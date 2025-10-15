import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { Agendamento } from '../../../../core/domain/entities/Agendamento';
import { IAgendamentosRepository, ICreateAgendamentoDTO, IUpdateAgendamentoDTO, IAgendamentoFilters, IPaginatedResponse } from '../../../../core/domain/repositories/IAgendamentosRepository';
import { AppError } from '../../../../shared/errors/AppError';

// Função para normalizar texto removendo acentos
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Função para criar padrão de busca que ignora acentos
function createAccentInsensitivePattern(searchTerm: string): string {
  const normalized = normalizeText(searchTerm);
  // Criar padrão regex que aceita tanto caracteres com quanto sem acento
  const pattern = normalized
    .replace(/a/g, '[aáàâãä]')
    .replace(/e/g, '[eéèêë]')
    .replace(/i/g, '[iíìîï]')
    .replace(/o/g, '[oóòôõö]')
    .replace(/u/g, '[uúùûü]')
    .replace(/c/g, '[cç]')
    .replace(/n/g, '[nñ]');
  return pattern;
}

function toDomain(agendamento: any): Agendamento {
  return {
    ...agendamento,
    servico: agendamento.servico,
    paciente: agendamento.paciente,
    profissional: agendamento.profissional,
    recurso: agendamento.recurso,
    convenio: agendamento.convenio,
    // Mapear os novos campos da série
    serieId: agendamento.serieId,
    serieMaster: agendamento.serieMaster,
    instanciaData: agendamento.instanciaData,
  };
}

@injectable()
export class PrismaAgendamentosRepository implements IAgendamentosRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: ICreateAgendamentoDTO): Promise<Agendamento> {
    // Separar os campos que precisam de mapeamento
    const { serieId, serieMaster, instanciaData, recorrencia, ...prismaData } = data;
    
    
    const agendamento = await this.prisma.agendamento.create({
      data: {
        ...prismaData,
        dataHoraInicio: data.dataHoraInicio,
        dataHoraFim: data.dataHoraFim,
        serieId: serieId,
        serieMaster: serieMaster,
        instanciaData: instanciaData,
        // recorrencia não é campo do banco, então não incluir
      },
      include: { 
        servico: true, 
        paciente: true, 
        profissional: { include: { conselho: true } }, 
        recurso: true, 
        convenio: true 
      },
    });
    
    // Verificar se os dados foram salvos corretamente
    if (serieId) {
      console.log('🔍 Série criada:', { id: agendamento.id, serieId: agendamento.serieId, serieMaster: agendamento.serieMaster });
    }
    
    return toDomain(agendamento);
  }

  async update(id: string, data: IUpdateAgendamentoDTO): Promise<Agendamento> {
    const agendamento = await this.prisma.agendamento.update({
      where: { id },
      data: {
        ...data,
        dataHoraInicio: data.dataHoraInicio,
        dataHoraFim: data.dataHoraFim,
        avaliadoPorId: data.avaliadoPorId || undefined,
        motivoReprovacao: data.motivoReprovacao || undefined,
      },
      include: { 
        servico: true, 
        paciente: true, 
        profissional: { include: { conselho: true } }, 
        recurso: true, 
        convenio: true 
      },
    });
    return toDomain(agendamento);
  }

  async findById(id: string): Promise<Agendamento | null> {
    const agendamento = await this.prisma.agendamento.findUnique({
      where: { id },
      include: { 
        servico: true, 
        paciente: true, 
        profissional: { include: { conselho: true } }, 
        recurso: true, 
        convenio: true 
      },
    });
    return agendamento ? toDomain(agendamento) : null;
  }

  async findByIds(ids: string[]): Promise<Agendamento[]> {
    const agendamentos = await this.prisma.agendamento.findMany({
      where: { 
        id: { in: ids }
      },
      include: { 
        servico: true, 
        paciente: true, 
        profissional: { include: { conselho: true } }, 
        recurso: true, 
        convenio: true 
      },
    });
    return agendamentos.map(toDomain);
  }

  async findAll(filters?: IAgendamentoFilters): Promise<IPaginatedResponse<Agendamento>> {
    // Valores para paginação (opcional)
    const limit = filters?.limit ? Math.min(filters.limit, 100) : undefined; // Só limita se explicitamente solicitado
    const page = filters?.page || 1;
    const skip = limit ? (page - 1) * limit : 0;
    const orderBy = filters?.orderBy || 'dataHoraInicio';
    const orderDirection = filters?.orderDirection || 'asc';

    const whereConditions: any = {};
    
    // Filtros básicos
    if (filters?.profissionalId) whereConditions.profissionalId = filters.profissionalId;
    if (filters?.pacienteId) whereConditions.pacienteId = filters.pacienteId;
    if (filters?.status) {
      whereConditions.status = filters.status;
    } else {
      // Por padrão, não retornar agendamentos arquivados na listagem geral
      whereConditions.status = { not: 'ARQUIVADO' };
    }
    if (filters?.recursoId) whereConditions.recursoId = filters.recursoId;
    if (filters?.convenioId) whereConditions.convenioId = filters.convenioId;
    if (filters?.convenioIdExcluir) {
      whereConditions.convenioId = { not: filters.convenioIdExcluir };
    }
    if (filters?.servicoId) whereConditions.servicoId = filters.servicoId;
    if (filters?.tipoAtendimento) whereConditions.tipoAtendimento = filters.tipoAtendimento;
    
    // Filtros de data - range
    if (filters?.dataInicio || filters?.dataFim) {
      whereConditions.dataHoraInicio = {};
      if (filters.dataInicio) {
        whereConditions.dataHoraInicio.gte = filters.dataInicio;
      }
      if (filters.dataFim) {
        // Para dataFim, incluir todo o dia (até 23:59:59)
        const endOfDay = new Date(filters.dataFim);
        endOfDay.setHours(23, 59, 59, 999);
        whereConditions.dataHoraInicio.lte = endOfDay;
      }
    }

    // Busca textual - busca por qualquer campo relacionado com suporte a acentos
    if (filters?.search) {
      const searchTerm = filters.search;
      
      // Busca dupla: termo original + termo sem acentos
      const normalizedSearch = normalizeText(searchTerm);
      
      whereConditions.OR = [
        // Busca pelo termo original
        { paciente: { nomeCompleto: { contains: searchTerm, mode: 'insensitive' } } },
        { profissional: { nome: { contains: searchTerm, mode: 'insensitive' } } },
        { servico: { nome: { contains: searchTerm, mode: 'insensitive' } } },
        { convenio: { nome: { contains: searchTerm, mode: 'insensitive' } } },
        { recurso: { nome: { contains: searchTerm, mode: 'insensitive' } } },
        { status: { contains: searchTerm, mode: 'insensitive' } },
        { tipoAtendimento: { contains: searchTerm, mode: 'insensitive' } },
      ];
      
      // Se o termo normalizado é diferente, adicionar busca também pelo normalizado
      if (normalizedSearch !== searchTerm.toLowerCase()) {
        whereConditions.OR = [
          ...whereConditions.OR,
          { paciente: { nomeCompleto: { contains: normalizedSearch, mode: 'insensitive' } } },
          { profissional: { nome: { contains: normalizedSearch, mode: 'insensitive' } } },
          { servico: { nome: { contains: normalizedSearch, mode: 'insensitive' } } },
          { convenio: { nome: { contains: normalizedSearch, mode: 'insensitive' } } },
          { recurso: { nome: { contains: normalizedSearch, mode: 'insensitive' } } },
        ];
      }
    }

    // Filtros específicos por nome (usam AND com outros filtros, mas OR entre si se múltiplos)
    const nameFilters = [];
    if (filters?.pacienteNome) {
      nameFilters.push({ paciente: { nomeCompleto: { contains: filters.pacienteNome, mode: 'insensitive' } } });
      // Buscar também versão normalizada
      const normalized = normalizeText(filters.pacienteNome);
      if (normalized !== filters.pacienteNome.toLowerCase()) {
        nameFilters.push({ paciente: { nomeCompleto: { contains: normalized, mode: 'insensitive' } } });
      }
    }
    if (filters?.profissionalNome) {
      nameFilters.push({ profissional: { nome: { contains: filters.profissionalNome, mode: 'insensitive' } } });
      // Buscar também versão normalizada
      const normalized = normalizeText(filters.profissionalNome);
      if (normalized !== filters.profissionalNome.toLowerCase()) {
        nameFilters.push({ profissional: { nome: { contains: normalized, mode: 'insensitive' } } });
      }
    }
    if (filters?.servicoNome) {
      nameFilters.push({ servico: { nome: { contains: filters.servicoNome, mode: 'insensitive' } } });
      // Buscar também versão normalizada
      const normalized = normalizeText(filters.servicoNome);
      if (normalized !== filters.servicoNome.toLowerCase()) {
        nameFilters.push({ servico: { nome: { contains: normalized, mode: 'insensitive' } } });
      }
    }
    if (filters?.convenioNome) {
      nameFilters.push({ convenio: { nome: { contains: filters.convenioNome, mode: 'insensitive' } } });
      // Buscar também versão normalizada
      const normalized = normalizeText(filters.convenioNome);
      if (normalized !== filters.convenioNome.toLowerCase()) {
        nameFilters.push({ convenio: { nome: { contains: normalized, mode: 'insensitive' } } });
      }
    }
    
    // Se temos filtros de nome específicos, sobrescrevem a busca geral
    if (nameFilters.length > 0) {
      whereConditions.OR = nameFilters;
    }

    // Configurar opções da consulta
    const queryOptions: any = {
      where: whereConditions,
      include: {
        servico: true,
        paciente: true,
        profissional: { include: { conselho: true } },
        recurso: true,
        convenio: true
      },
      orderBy: { [orderBy]: orderDirection },
    };

    // Só aplicar skip/take se limit for especificado
    if (limit) {
      queryOptions.skip = skip;
      queryOptions.take = limit;
    }

    // Executar consultas em paralelo
    const [agendamentos, total] = await Promise.all([
      this.prisma.agendamento.findMany(queryOptions),
      this.prisma.agendamento.count({
        where: whereConditions,
      })
    ]);

    // Calcular número de sessão para cada agendamento de forma otimizada
    const agendamentosComSessao = await this.calcularNumerosSessao(agendamentos);

    // Filtro de primeira sessão (aplicado após calcular números)
    let agendamentosFiltrados = agendamentosComSessao;
    if (filters?.primeiraSessao && (filters.primeiraSessao === 'true' || filters.primeiraSessao === 'false')) {
      const isPrimeiraSessaoFilter = filters.primeiraSessao === 'true';
      agendamentosFiltrados = agendamentosComSessao.filter(
        agendamento => (agendamento.numeroSessao === 1) === isPrimeiraSessaoFilter
      );
    }

    // Atualizar total se houve filtragem de primeira sessão
    const totalFinal = filters?.primeiraSessao && (filters.primeiraSessao === 'true' || filters.primeiraSessao === 'false')
      ? agendamentosFiltrados.length
      : total;

    const totalPages = limit ? Math.ceil(totalFinal / limit) : 1;

    return {
      data: agendamentosFiltrados.map(toDomain),
      pagination: {
        page: limit ? page : 1,
        limit: limit || 0, // Retorna 0 quando não há limite especificado
        total: totalFinal,
        totalPages,
      },
    };
  }

  // Função para calcular número de sessão de forma otimizada
  private async calcularNumerosSessao(agendamentos: any[]): Promise<any[]> {
    if (agendamentos.length === 0) return [];

    // Criar mapa de contagens por chave única (paciente+profissional+serviço)
    const contagemMap = new Map<string, number>();

    // Para cada agendamento, buscar todos os agendamentos anteriores da mesma combinação
    for (const agendamento of agendamentos) {
      const chave = `${agendamento.pacienteId}-${agendamento.servicoId}`;

      // Buscar contagem total até a data deste agendamento (excluindo cancelados)
      const count = await this.prisma.agendamento.count({
        where: {
          pacienteId: agendamento.pacienteId,
          servicoId: agendamento.servicoId,
          dataHoraInicio: {
            lte: agendamento.dataHoraInicio
          },
          status: {
            not: 'CANCELADO'
          }
        }
      });

      agendamento.numeroSessao = count;
    }

    return agendamentos;
  }

  async findByProfissionalAndDataHoraInicio(profissionalId: string, dataHoraInicio: Date): Promise<Agendamento | null> {
    const agendamento = await this.prisma.agendamento.findFirst({
      where: { profissionalId, dataHoraInicio },
    });
    return agendamento ? toDomain(agendamento) : null;
  }

  async findByRecursoAndDataHoraInicio(recursoId: string, dataHoraInicio: Date): Promise<Agendamento | null> {
    const agendamento = await this.prisma.agendamento.findFirst({
      where: { recursoId, dataHoraInicio },
    });
    return agendamento ? toDomain(agendamento) : null;
  }

  async findByPacienteAndDataHoraInicio(
    pacienteId: string,
    dataHoraInicio: Date
  ): Promise<Agendamento | null> {
    const agendamento = await this.prisma.agendamento.findFirst({
      where: {
        pacienteId,
        dataHoraInicio,
      },
    });
    return agendamento ? toDomain(agendamento) : null;
  }

  async findByRecursoAndDateRange(recursoId: string, dataInicio: Date, dataFim: Date): Promise<Agendamento[]> {
    const agendamentos = await this.prisma.agendamento.findMany({
      where: {
        recursoId,
        dataHoraInicio: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      include: { servico: true, paciente: true, profissional: true, recurso: true, convenio: true },
      orderBy: { dataHoraInicio: 'asc' },
    });
    return agendamentos.map(toDomain);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.agendamento.delete({ where: { id } });
    } catch (error: any) {
      // Verificar se é erro de foreign key constraint relacionado a agendamentos_contas
      if (
        error.code === 'P2003' ||
        error.message?.includes('agendamentos_contas') ||
        error.message?.includes('Foreign key constraint')
      ) {
        throw new AppError(
          'Não é possível excluir este agendamento pois existem contas financeiras vinculadas a ele. Remova primeiro as contas a receber ou a pagar associadas.',
          400
        );
      }
      // Relançar outros erros
      throw error;
    }
  }
} 
