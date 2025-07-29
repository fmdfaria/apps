import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateConselhoProfissionalUseCase } from '../../../core/application/use-cases/conselho-profissional/CreateConselhoProfissionalUseCase';
import { ListConselhosProfissionaisUseCase } from '../../../core/application/use-cases/conselho-profissional/ListConselhosProfissionaisUseCase';
import { UpdateConselhoProfissionalUseCase } from '../../../core/application/use-cases/conselho-profissional/UpdateConselhoProfissionalUseCase';
import { DeleteConselhoProfissionalUseCase } from '../../../core/application/use-cases/conselho-profissional/DeleteConselhoProfissionalUseCase';

export class ConselhosProfissionaisController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const createBodySchema = z.object({
      sigla: z.string().min(2),
      nome: z.string().min(3),
    });
    const { sigla, nome } = createBodySchema.parse(request.body);
    const useCase = container.resolve(CreateConselhoProfissionalUseCase);
    const conselho = await useCase.execute({ sigla, nome });
    return reply.status(201).send(conselho);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const useCase = container.resolve(ListConselhosProfissionaisUseCase);
    const conselhos = await useCase.execute();
    return reply.status(200).send(conselhos);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const updateParamsSchema = z.object({ id: z.string().uuid() });
    const updateBodySchema = z.object({
      sigla: z.string().min(2),
      nome: z.string().min(3),
    });
    const { id } = updateParamsSchema.parse(request.params);
    const { sigla, nome } = updateBodySchema.parse(request.body);
    const useCase = container.resolve(UpdateConselhoProfissionalUseCase);
    const conselho = await useCase.execute({ id, sigla, nome });
    return reply.status(200).send(conselho);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const deleteParamsSchema = z.object({ id: z.string().uuid() });
    const { id } = deleteParamsSchema.parse(request.params);
    const useCase = container.resolve(DeleteConselhoProfissionalUseCase);
    await useCase.execute({ id });
    return reply.status(204).send();
  }
} 