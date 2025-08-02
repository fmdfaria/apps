import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { ListProfissionaisServicosUseCase } from '../../../core/application/use-cases/profissional-servico/ListProfissionaisServicosUseCase';
import { ListProfissionaisByServicoUseCase } from '../../../core/application/use-cases/profissional-servico/ListProfissionaisByServicoUseCase';

export class ProfissionaisServicosController {
  async index(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const listProfissionaisServicosUseCase = container.resolve(ListProfissionaisServicosUseCase);

    const profissionaisServicos = await listProfissionaisServicosUseCase.execute();

    return reply.status(200).send(profissionaisServicos);
  }

  async show(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);

    const listProfissionaisByServicoUseCase = container.resolve(ListProfissionaisByServicoUseCase);

    const profissionaisServicos = await listProfissionaisByServicoUseCase.execute({
      servicoId: id,
    });

    return reply.status(200).send(profissionaisServicos);
  }
}