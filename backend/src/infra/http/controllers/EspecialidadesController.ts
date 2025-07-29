import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateEspecialidadeUseCase } from '../../../core/application/use-cases/especialidade/CreateEspecialidadeUseCase';
import { ListEspecialidadesUseCase } from '../../../core/application/use-cases/especialidade/ListEspecialidadesUseCase';
import { UpdateEspecialidadeUseCase } from '../../../core/application/use-cases/especialidade/UpdateEspecialidadeUseCase';
import { DeleteEspecialidadeUseCase } from '../../../core/application/use-cases/especialidade/DeleteEspecialidadeUseCase';

export class EspecialidadesController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const createEspecialidadeBodySchema = z.object({
      nome: z.string(),
    });

    const { nome } = createEspecialidadeBodySchema.parse(request.body);

    const createEspecialidadeUseCase = container.resolve(CreateEspecialidadeUseCase);

    const especialidade = await createEspecialidadeUseCase.execute({ nome });

    return reply.status(201).send(especialidade);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const listEspecialidadesUseCase = container.resolve(ListEspecialidadesUseCase);

    const especialidades = await listEspecialidadesUseCase.execute();

    return reply.status(200).send(especialidades);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const updateEspecialidadeParamsSchema = z.object({
      id: z.string().uuid(),
    });
    const updateEspecialidadeBodySchema = z.object({
      nome: z.string(),
    });

    const { id } = updateEspecialidadeParamsSchema.parse(request.params);
    const { nome } = updateEspecialidadeBodySchema.parse(request.body);

    const updateEspecialidadeUseCase = container.resolve(UpdateEspecialidadeUseCase);

    const especialidade = await updateEspecialidadeUseCase.execute({ id, nome });

    return reply.status(200).send(especialidade);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const deleteEspecialidadeParamsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = deleteEspecialidadeParamsSchema.parse(request.params);

    const deleteEspecialidadeUseCase = container.resolve(DeleteEspecialidadeUseCase);

    await deleteEspecialidadeUseCase.execute({ id });

    return reply.status(204).send();
  }
} 