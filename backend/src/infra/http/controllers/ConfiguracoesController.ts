import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateConfiguracaoUseCase } from '../../../core/application/use-cases/configuracao/CreateConfiguracaoUseCase';
import { ListConfiguracaoUseCase } from '../../../core/application/use-cases/configuracao/ListConfiguracaoUseCase';
import { UpdateConfiguracaoUseCase } from '../../../core/application/use-cases/configuracao/UpdateConfiguracaoUseCase';
import { DeleteConfiguracaoUseCase } from '../../../core/application/use-cases/configuracao/DeleteConfiguracaoUseCase';
import { GetConfiguracoesUseCase } from '../../../core/application/use-cases/configuracao/GetConfiguracoesUseCase';

const tiposValorPermitidos = ['string', 'number', 'boolean', 'json', 'date'] as const;

const bodySchema = z.object({
  entidadeTipo: z.string().min(1),
  entidadeId: z.string().uuid().optional().nullable(),
  contexto: z.string().min(1),
  chave: z.string().min(1),
  valor: z.string(),
  tipoValor: z.enum(tiposValorPermitidos).optional(),
  descricao: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

export class ConfiguracoesController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const data = bodySchema.parse(request.body);
    
    const useCase = container.resolve(CreateConfiguracaoUseCase);
    const configuracao = await useCase.execute(data);
    
    return reply.status(201).send(configuracao);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const useCase = container.resolve(ListConfiguracaoUseCase);
    const configuracoes = await useCase.execute();
    
    return reply.status(200).send(configuracoes);
  }

  async getByEntity(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const querySchema = z.object({
      entidadeTipo: z.string(),
      entidadeId: z.string().optional(),
      contexto: z.string().optional(),
    });

    const query = querySchema.parse(request.query);
    
    const useCase = container.resolve(GetConfiguracoesUseCase);
    const configuracoes = await useCase.execute({
      entidadeTipo: query.entidadeTipo,
      entidadeId: query.entidadeId || null,
      contexto: query.contexto,
    });
    
    return reply.status(200).send(configuracoes);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const updateBodySchema = bodySchema.partial();
    
    const { id } = paramsSchema.parse(request.params);
    const data = updateBodySchema.parse(request.body);
    
    const useCase = container.resolve(UpdateConfiguracaoUseCase);
    const configuracao = await useCase.execute({ id, ...data });
    
    return reply.status(200).send(configuracao);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    
    const { id } = paramsSchema.parse(request.params);
    
    const useCase = container.resolve(DeleteConfiguracaoUseCase);
    await useCase.execute({ id });
    
    return reply.status(204).send();
  }
}