import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateAdendoContratoUseCase } from '../../../core/application/use-cases/adendo-contrato/CreateAdendoContratoUseCase';
import { UpdateAdendoContratoUseCase } from '../../../core/application/use-cases/adendo-contrato/UpdateAdendoContratoUseCase';
import { ListAdendosContratosUseCase } from '../../../core/application/use-cases/adendo-contrato/ListAdendosContratosUseCase';
import { DeleteAdendoContratoUseCase } from '../../../core/application/use-cases/adendo-contrato/DeleteAdendoContratoUseCase';

const adendoBodySchema = z.object({
  contratoId: z.string().uuid(),
  dataAdendo: z.coerce.date(),
  arquivoAdendo: z.string().url().nullable().optional(),
  descricao: z.string().optional(),
});

export class AdendosContratosController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const data = adendoBodySchema.parse(request.body);
    const useCase = container.resolve(CreateAdendoContratoUseCase);
    const adendo = await useCase.execute(data);
    return reply.status(201).send(adendo);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const data = adendoBodySchema.partial().parse(request.body);
    const useCase = container.resolve(UpdateAdendoContratoUseCase);
    const adendo = await useCase.execute(id, data);
    return reply.status(200).send(adendo);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const querySchema = z.object({
      contratoId: z.string().uuid().optional(),
    });
    const filters = querySchema.parse(request.query);
    const useCase = container.resolve(ListAdendosContratosUseCase);
    const adendos = await useCase.execute(filters);
    return reply.status(200).send(adendos);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const useCase = container.resolve(DeleteAdendoContratoUseCase);
    await useCase.execute(id);
    return reply.status(204).send();
  }
} 