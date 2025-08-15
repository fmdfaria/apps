import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateServicoUseCase } from '../../../core/application/use-cases/servico/CreateServicoUseCase';
import { ListServicosUseCase } from '../../../core/application/use-cases/servico/ListServicosUseCase';
import { UpdateServicoUseCase } from '../../../core/application/use-cases/servico/UpdateServicoUseCase';
import { DeleteServicoUseCase } from '../../../core/application/use-cases/servico/DeleteServicoUseCase';

export class ServicosController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const createBodySchema = z.object({
      nome: z.string().min(3),
      descricao: z.string().optional(),
      duracaoMinutos: z.number().int().positive(),
      preco: z.number().positive(),
      percentualClinica: z.number().min(0).max(100).optional(),
      percentualProfissional: z.number().min(0).max(100).optional(),
      valorClinica: z.number().positive().optional().nullable(),
      valorProfissional: z.number().positive().optional().nullable(),
      procedimentoPrimeiroAtendimento: z.string().optional(),
      procedimentoDemaisAtendimentos: z.string().optional(),
      convenioId: z.string().uuid().optional(),
    });
    const data = createBodySchema.parse(request.body);
    const useCase = container.resolve(CreateServicoUseCase);
    const servico = await useCase.execute(data);
    return reply.status(201).send(servico);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const useCase = container.resolve(ListServicosUseCase);
    const servicos = await useCase.execute();
    return reply.status(200).send(servicos);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const updateParamsSchema = z.object({ id: z.string().uuid() });
    const updateBodySchema = z.object({
      nome: z.string().min(3),
      descricao: z.string().optional(),
      duracaoMinutos: z.number().int().positive(),
      preco: z.number().positive(),
      percentualClinica: z.number().min(0).max(100).optional().nullable(),
      percentualProfissional: z.number().min(0).max(100).optional().nullable(),
      valorClinica: z.number().positive().optional().nullable(),
      valorProfissional: z.number().positive().optional().nullable(),
      procedimentoPrimeiroAtendimento: z.string().optional(),
      procedimentoDemaisAtendimentos: z.string().optional(),
      convenioId: z.string().uuid().optional(),
    });
    const { id } = updateParamsSchema.parse(request.params);
    const data = updateBodySchema.parse(request.body);
    const useCase = container.resolve(UpdateServicoUseCase);
    const servico = await useCase.execute({ id, ...data });
    return reply.status(200).send(servico);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const deleteParamsSchema = z.object({ id: z.string().uuid() });
    const { id } = deleteParamsSchema.parse(request.params);
    const useCase = container.resolve(DeleteServicoUseCase);
    await useCase.execute({ id });
    return reply.status(204).send();
  }
} 