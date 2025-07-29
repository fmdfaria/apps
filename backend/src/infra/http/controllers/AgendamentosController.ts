import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateAgendamentoUseCase } from '../../../core/application/use-cases/agendamento/CreateAgendamentoUseCase';
import { ListAgendamentosUseCase } from '../../../core/application/use-cases/agendamento/ListAgendamentosUseCase';
import { UpdateAgendamentoUseCase } from '../../../core/application/use-cases/agendamento/UpdateAgendamentoUseCase';
import { DeleteAgendamentoUseCase } from '../../../core/application/use-cases/agendamento/DeleteAgendamentoUseCase';

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
  recorrencia: recorrenciaSchema.optional(),
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
      status: z.string().optional(),
    });
    const filters = querySchema.parse(request.query);
    const useCase = container.resolve(ListAgendamentosUseCase);
    const agendamentos = await useCase.execute(filters);
    return reply.status(200).send(agendamentos);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const data = agendamentoBodySchema.partial().parse(request.body);
    const useCase = container.resolve(UpdateAgendamentoUseCase);
    const agendamento = await useCase.execute(id, data);
    return reply.status(200).send(agendamento);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const useCase = container.resolve(DeleteAgendamentoUseCase);
    await useCase.execute(id);
    return reply.status(204).send();
  }
} 