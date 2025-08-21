import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateAgendamentoUseCase } from '../../../core/application/use-cases/agendamento/CreateAgendamentoUseCase';
import { ListAgendamentosUseCase } from '../../../core/application/use-cases/agendamento/ListAgendamentosUseCase';
import { UpdateAgendamentoUseCase } from '../../../core/application/use-cases/agendamento/UpdateAgendamentoUseCase';
import { DeleteAgendamentoUseCase } from '../../../core/application/use-cases/agendamento/DeleteAgendamentoUseCase';
import { GetAgendamentoFormDataUseCase } from '../../../core/application/use-cases/agendamento/GetAgendamentoFormDataUseCase';

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
  recebimento: z.boolean().optional(),
  pagamento: z.boolean().optional(),
  recorrencia: recorrenciaSchema.optional(),
  // Novos campos (avaliador e motivo de reprovação)
  avaliadoPorId: z.string().uuid().optional().nullable(),
  motivoReprovacao: z.string().optional().nullable(),
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
      profissionalId: z.string().uuid().optional(),
      pacienteId: z.string().uuid().optional(),
      dataHoraInicio: z.coerce.date().optional(),
      dataHoraFim: z.coerce.date().optional(),
      status: z.string().optional(),
    });
    const filters = querySchema.parse(request.query);
    const useCase = container.resolve(ListAgendamentosUseCase);
    const agendamentos = await useCase.execute(filters);
    return reply.status(200).send(agendamentos);
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
    const useCase = container.resolve(DeleteAgendamentoUseCase);
    await useCase.execute(id);
    return reply.status(204).send();
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

  async atender(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    
    // Schema específico para atendimento - apenas campos permitidos para atendimento
    const atenderBodySchema = z.object({
      status: z.literal('ATENDIDO'),
      dataHoraInicio: z.coerce.date().optional(),
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
} 