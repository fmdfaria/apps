import { FastifyReply, FastifyRequest } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreatePrecoServicoProfissionalUseCase } from '../../../core/application/use-cases/precos-servicos-profissionais/CreatePrecoServicoProfissionalUseCase';
import { UpdatePrecoServicoProfissionalUseCase } from '../../../core/application/use-cases/precos-servicos-profissionais/UpdatePrecoServicoProfissionalUseCase';
import { ListPrecosServicosProfissionaisUseCase } from '../../../core/application/use-cases/precos-servicos-profissionais/ListPrecosServicosProfissionaisUseCase';
import { DeletePrecoServicoProfissionalUseCase } from '../../../core/application/use-cases/precos-servicos-profissionais/DeletePrecoServicoProfissionalUseCase';

const createPrecoSchema = z.object({
  profissionalId: z.string().uuid(),
  servicoId: z.string().uuid(),
  precoProfissional: z.number().optional().nullable(),
  precoClinica: z.number().optional().nullable(),
});

const updatePrecoSchema = z.object({
  precoProfissional: z.number().optional().nullable(),
  precoClinica: z.number().optional().nullable(),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const querySchema = z.object({
  profissionalId: z.string().uuid().optional(),
  servicoId: z.string().uuid().optional(),
});

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const data = createPrecoSchema.parse(request.body);
  const useCase = container.resolve(CreatePrecoServicoProfissionalUseCase);
  const preco = await useCase.execute(data);
  return reply.status(201).send(preco);
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const { id } = paramsSchema.parse(request.params);
  const data = updatePrecoSchema.parse(request.body);
  const useCase = container.resolve(UpdatePrecoServicoProfissionalUseCase);
  const preco = await useCase.execute({ id, ...data });
  return reply.status(200).send(preco);
}

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const filters = querySchema.parse(request.query);
  const useCase = container.resolve(ListPrecosServicosProfissionaisUseCase);
  const precos = await useCase.execute(filters);
  return reply.status(200).send(precos);
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = paramsSchema.parse(request.params);
  const useCase = container.resolve(DeletePrecoServicoProfissionalUseCase);
  await useCase.execute(id);
  return reply.status(204).send();
} 