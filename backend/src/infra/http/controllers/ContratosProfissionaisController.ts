import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateContratoProfissionalUseCase } from '../../../core/application/use-cases/contrato-profissional/CreateContratoProfissionalUseCase';
import { UpdateContratoProfissionalUseCase } from '../../../core/application/use-cases/contrato-profissional/UpdateContratoProfissionalUseCase';
import { ListContratosProfissionaisUseCase } from '../../../core/application/use-cases/contrato-profissional/ListContratosProfissionaisUseCase';
import { DeleteContratoProfissionalUseCase } from '../../../core/application/use-cases/contrato-profissional/DeleteContratoProfissionalUseCase';

const contratoBodySchema = z.object({
  profissionalId: z.string().uuid(),
  dataInicio: z.coerce.date(),
  dataFim: z.coerce.date().nullable().optional(),
  arquivoContrato: z.string().url().nullable().optional(),
  observacao: z.string().optional(),
});

export class ContratosProfissionaisController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const data = contratoBodySchema.parse(request.body);
    const useCase = container.resolve(CreateContratoProfissionalUseCase);
    const contrato = await useCase.execute(data);
    return reply.status(201).send(contrato);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const data = contratoBodySchema.partial().parse(request.body);
    const useCase = container.resolve(UpdateContratoProfissionalUseCase);
    const contrato = await useCase.execute(id, data);
    return reply.status(200).send(contrato);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const querySchema = z.object({
      profissionalId: z.string().uuid().optional(),
    });
    const filters = querySchema.parse(request.query);
    const useCase = container.resolve(ListContratosProfissionaisUseCase);
    const contratos = await useCase.execute(filters);
    return reply.status(200).send(contratos);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const useCase = container.resolve(DeleteContratoProfissionalUseCase);
    await useCase.execute(id);
    return reply.status(204).send();
  }
} 