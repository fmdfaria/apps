import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateFilaEsperaUseCase } from '../../../core/application/use-cases/fila-espera/CreateFilaEsperaUseCase';
import { ListFilaEsperaUseCase } from '../../../core/application/use-cases/fila-espera/ListFilaEsperaUseCase';
import { UpdateFilaEsperaUseCase } from '../../../core/application/use-cases/fila-espera/UpdateFilaEsperaUseCase';
import { DeleteFilaEsperaUseCase } from '../../../core/application/use-cases/fila-espera/DeleteFilaEsperaUseCase';
import { UpdateFilaEsperaStatusUseCase } from '../../../core/application/use-cases/fila-espera/UpdateFilaEsperaStatusUseCase';
import { IFilaEsperaRepository } from '../../../core/domain/repositories/IFilaEsperaRepository';

const bodySchema = z.object({
  pacienteId: z.string().uuid(),
  servicoId: z.string().uuid(),
  profissionalId: z.string().uuid().optional().nullable(),
  horarioPreferencia: z.enum(['MANHÃ', 'TARDE', 'NOITE']),
  observacao: z.string().optional().nullable(),
  status: z.string().max(20).optional().nullable(),
  ativo: z.boolean().optional(),
});

export class FilaEsperaController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const data = bodySchema.parse(request.body);
    const useCase = container.resolve(CreateFilaEsperaUseCase);
    const created = await useCase.execute(data);
    return reply.status(201).send(created);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const querySchema = z.object({ ativo: z.coerce.boolean().optional() });
    const { ativo } = querySchema.parse(request.query);
    const useCase = container.resolve(ListFilaEsperaUseCase);
    const items = await useCase.execute(ativo === true);
    return reply.status(200).send(items);
  }

  async show(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const repo = container.resolve('FilaEsperaRepository') as IFilaEsperaRepository;
    const item = await repo.findById(id);
    if (!item) {
      return reply.status(404).send({ message: 'Item da fila de espera não encontrado.' });
    }
    return reply.status(200).send(item);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const data = bodySchema.parse(request.body);
    const useCase = container.resolve(UpdateFilaEsperaUseCase);
    const updated = await useCase.execute({ id, ...data });
    return reply.status(200).send(updated);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const useCase = container.resolve(DeleteFilaEsperaUseCase);
    await useCase.execute({ id });
    return reply.status(204).send();
  }

  async updateStatus(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({ ativo: z.boolean() });
    const { id } = paramsSchema.parse(request.params);
    const { ativo } = bodySchema.parse(request.body);
    const useCase = container.resolve(UpdateFilaEsperaStatusUseCase);
    const updated = await useCase.execute({ id, ativo });
    return reply.status(200).send(updated);
  }
}


