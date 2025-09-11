import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateAgendamentoUseCase } from '../../../core/application/use-cases/agendamento/CreateAgendamentoUseCase';
import { ListAgendamentosUseCase } from '../../../core/application/use-cases/agendamento/ListAgendamentosUseCase';
import { UpdateAgendamentoUseCase } from '../../../core/application/use-cases/agendamento/UpdateAgendamentoUseCase';
import { DeleteAgendamentoUseCase } from '../../../core/application/use-cases/agendamento/DeleteAgendamentoUseCase';
import { GetAgendamentoFormDataUseCase } from '../../../core/application/use-cases/agendamento/GetAgendamentoFormDataUseCase';
import { LiberarAgendamentoParticularUseCase } from '../../../core/application/use-cases/LiberarAgendamentoParticularUseCase';

const recorrenciaSchema = z.object({
  tipo: z.enum(['semanal', 'quinzenal', 'mensal']),
  ate: z.coerce.date().optional(),
  repeticoes: z.number().int().positive().optional(),
});

const agendamentoBodySchema = z.object({
  pacienteId: z.string().uuid(),
  profissionalId: z.string().uuid(),
  tipoAtendimento: z.string(),
  recursoId: z.string().uuid(),
  convenioId: z.string().uuid(),
  servicoId: z.string().uuid(),
  dataHoraInicio: z.coerce.date(),
  codLiberacao: z.string().optional().nullable(),
  statusCodLiberacao: z.string().optional().nullable(),
  dataCodLiberacao: z.coerce.date().optional().nullable(),
  status: z.string().optional(),
  compareceu: z.boolean().optional().nullable(),
  assinaturaPaciente: z.boolean().optional().nullable(),
  assinaturaProfissional: z.boolean().optional().nullable(),
  dataAtendimento: z.coerce.date().optional().nullable(),
  recebimento: z.boolean().optional(),
  pagamento: z.boolean().optional(),
  recorrencia: recorrenciaSchema.optional(),
  // Novos campos (avaliador e motivo de reprovação)
  avaliadoPorId: z.string().uuid().optional().nullable(),
  motivoReprovacao: z.string().optional().nullable(),
  // Campo para tipo de edição de recorrência
  tipoEdicaoRecorrencia: z.enum(['apenas_esta', 'esta_e_futuras', 'toda_serie']).optional(),
});

export class AgendamentosController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const data = agendamentoBodySchema.parse(request.body);
    const useCase = container.resolve(CreateAgendamentoUseCase);
    const agendamento = await useCase.execute(data);
    return reply.status(201).send(agendamento);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const querySchema = z.object({
      // Paginação
      page: z.coerce.number().int().min(1).optional().default(1),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      orderBy: z.string().optional().default('dataHoraInicio'),
      orderDirection: z.enum(['asc', 'desc']).optional().default('asc'),
      
      // Filtros
      status: z.string().optional(),
      profissionalId: z.string().uuid().optional(),
      pacienteId: z.string().uuid().optional(),
      recursoId: z.string().uuid().optional(),
      convenioId: z.string().uuid().optional(),
      convenioIdExcluir: z.string().uuid().optional(),
      servicoId: z.string().uuid().optional(),
      dataInicio: z.coerce.date().optional(),
      dataFim: z.coerce.date().optional(),
      tipoAtendimento: z.string().optional(),
      
      // Busca textual
      search: z.string().optional(),
      pacienteNome: z.string().optional(),
      profissionalNome: z.string().optional(),
      servicoNome: z.string().optional(),
      convenioNome: z.string().optional(),
    });
    
    const filters = querySchema.parse(request.query);
    const useCase = container.resolve(ListAgendamentosUseCase);
    const result = await useCase.execute(filters);
    return reply.status(200).send(result);
  }

  async getFormData(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const querySchema = z.object({
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD').optional(),
      profissionalId: z.string().uuid().optional(),
    });

    const { data, profissionalId } = querySchema.parse(request.query);

    const getFormDataUseCase = container.resolve(GetAgendamentoFormDataUseCase);

    const formData = await getFormDataUseCase.execute({ data, profissionalId });

    return reply.status(200).send(formData);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const data = agendamentoBodySchema.partial().parse(request.body);
    // Garantir que reprovação registre avaliador e motivo, se não vierem do cliente
    const userId = (request as any).user?.id as string | undefined;
    const payload = { ...data } as any;
    if (payload.status === 'PENDENTE') {
      if (userId && !payload.avaliadoPorId) payload.avaliadoPorId = userId;
      if (!payload.motivoReprovacao && payload.motivoCancelamento) payload.motivoReprovacao = payload.motivoCancelamento;
    }
    const useCase = container.resolve(UpdateAgendamentoUseCase);
    const agendamento = await useCase.execute(id, payload);
    return reply.status(200).send(agendamento);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    
    // Permitir tipoEdicaoRecorrencia como query param ou body
    const querySchema = z.object({
      tipoEdicaoRecorrencia: z.enum(['apenas_esta', 'esta_e_futuras', 'toda_serie']).optional()
    });
    const bodySchema = z.object({
      tipoEdicaoRecorrencia: z.enum(['apenas_esta', 'esta_e_futuras', 'toda_serie']).optional()
    });
    
    // Verificar query params primeiro, depois body
    let tipoEdicaoRecorrencia;
    try {
      const queryParams = querySchema.parse(request.query);
      tipoEdicaoRecorrencia = queryParams.tipoEdicaoRecorrencia;
    } catch {
      try {
        const bodyParams = bodySchema.parse(request.body);
        tipoEdicaoRecorrencia = bodyParams.tipoEdicaoRecorrencia;
      } catch {
        // Se não encontrar em nenhum lugar, usar undefined (comportamento automático)
      }
    }
    
    const useCase = container.resolve(DeleteAgendamentoUseCase);
    await useCase.execute(id, tipoEdicaoRecorrencia);
    return reply.status(204).send();
  }

  async getSeriesInfo(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    
    const useCase = container.resolve(DeleteAgendamentoUseCase);
    const seriesInfo = await useCase.getSeriesDeleteInfo(id);
    return reply.status(200).send(seriesInfo);
  }

  async liberar(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    
    // Schema específico para liberação - apenas campos permitidos para liberação
    const liberarBodySchema = z.object({
      codLiberacao: z.string(),
      statusCodLiberacao: z.string(),
      dataCodLiberacao: z.coerce.date(),
      status: z.literal('LIBERADO') // Força o status para LIBERADO
    });
    
    const data = liberarBodySchema.parse(request.body);
    const useCase = container.resolve(UpdateAgendamentoUseCase);
    const agendamento = await useCase.execute(id, data);
    return reply.status(200).send(agendamento);
  }

  async liberarParticular(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    
    // Schema específico para liberação particular - apenas campos permitidos
    const liberarParticularBodySchema = z.object({
      recebimento: z.boolean(),
      dataLiberacao: z.string(),
      status: z.literal('LIBERADO').optional() // Opcional, será definido automaticamente
    });
    
    const data = liberarParticularBodySchema.parse(request.body);
    const useCase = container.resolve(LiberarAgendamentoParticularUseCase);
    
    // Obter userId do request (assumindo que está disponível após autenticação)
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Usuário não autenticado' });
    }
    
    const agendamento = await useCase.execute({
      agendamentoId: id,
      userId,
      recebimento: data.recebimento,
      dataLiberacao: data.dataLiberacao
    });
    
    return reply.status(200).send(agendamento);
  }

  async atender(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    
    // Schema específico para atendimento - apenas campos permitidos para atendimento
    const atenderBodySchema = z.object({
      status: z.literal('ATENDIDO'),
      dataAtendimento: z.coerce.date().optional(),
      observacoes: z.string().optional(),
      avaliadoPorId: z.string().uuid().optional(),
    });
    
    const data = atenderBodySchema.parse(request.body);
    const useCase = container.resolve(UpdateAgendamentoUseCase);
    const agendamento = await useCase.execute(id, data);
    return reply.status(200).send(agendamento);
  }

  async concluir(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    
    // Schema específico para conclusão - apenas campos permitidos para conclusão
    const concluirBodySchema = z.object({
      status: z.literal('FINALIZADO'),
      observacoes: z.string().optional(),
      resultadoConsulta: z.string().optional(),
      avaliadoPorId: z.string().uuid().optional(),
    });
    
    const data = concluirBodySchema.parse(request.body);
    const useCase = container.resolve(UpdateAgendamentoUseCase);
    const agendamento = await useCase.execute(id, data);
    return reply.status(200).send(agendamento);
  }

  async pendencia(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    
    // Schema específico para pendência - apenas campos permitidos para resolver pendências
    const pendenciaBodySchema = z.object({
      status: z.literal('ATENDIDO'), // Força o status para ATENDIDO
      observacoes: z.string().optional(),
      avaliadoPorId: z.string().uuid().optional(),
    });
    
    const data = pendenciaBodySchema.parse(request.body);
    const useCase = container.resolve(UpdateAgendamentoUseCase);
    const agendamento = await useCase.execute(id, data);
    return reply.status(200).send(agendamento);
  }
} 