import { FastifyReply, FastifyRequest } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreatePrecoParticularUseCase } from '../../../core/application/use-cases/precos-particulares/CreatePrecoParticularUseCase';
import { UpdatePrecoParticularUseCase } from '../../../core/application/use-cases/precos-particulares/UpdatePrecoParticularUseCase';
import { ListPrecosParticularesUseCase } from '../../../core/application/use-cases/precos-particulares/ListPrecosParticularesUseCase';
import { DeletePrecoParticularUseCase } from '../../../core/application/use-cases/precos-particulares/DeletePrecoParticularUseCase';

const createPrecoSchema = z.object({
  pacienteId: z.string().uuid(),
  servicoId: z.string().uuid(),
  preco: z.number(),
  tipoPagamento: z.string().max(50).optional().nullable(),
  pagamentoAntecipado: z.boolean().optional().nullable(),
  diaPagamento: z.number().min(1).max(31).optional().nullable(),
  notaFiscal: z.boolean().optional().nullable(),
  recibo: z.boolean().optional().nullable(),
});

const updatePrecoSchema = z.object({
  preco: z.number().optional(),
  tipoPagamento: z.string().max(50).optional().nullable(),
  pagamentoAntecipado: z.boolean().optional().nullable(),
  diaPagamento: z.number().min(1).max(31).optional().nullable(),
  notaFiscal: z.boolean().optional().nullable(),
  recibo: z.boolean().optional().nullable(),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const querySchema = z.object({
  pacienteId: z.string().uuid().optional(),
  servicoId: z.string().uuid().optional(),
});

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const data = createPrecoSchema.parse(request.body);
  const useCase = container.resolve(CreatePrecoParticularUseCase);
  const preco = await useCase.execute(data);
  return reply.status(201).send(preco);
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const { id } = paramsSchema.parse(request.params);
  const data = updatePrecoSchema.parse(request.body);
  const useCase = container.resolve(UpdatePrecoParticularUseCase);
  const preco = await useCase.execute({ id, ...data });
  return reply.status(200).send(preco);
}

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const filters = querySchema.parse(request.query);
  const useCase = container.resolve(ListPrecosParticularesUseCase);
  const precos = await useCase.execute(filters);
  return reply.status(200).send(precos);
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = paramsSchema.parse(request.params);
  const useCase = container.resolve(DeletePrecoParticularUseCase);
  await useCase.execute(id);
  return reply.status(204).send();
} 