import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { AppError } from '../../../shared/errors/AppError';
import { CreateDisponibilidadeProfissionalUseCase } from '../../../core/application/use-cases/disponibilidade-profissional/CreateDisponibilidadeProfissionalUseCase';
import { UpdateDisponibilidadeProfissionalUseCase } from '../../../core/application/use-cases/disponibilidade-profissional/UpdateDisponibilidadeProfissionalUseCase';
import { ListDisponibilidadesProfissionaisUseCase } from '../../../core/application/use-cases/disponibilidade-profissional/ListDisponibilidadesProfissionaisUseCase';
import { DeleteDisponibilidadeProfissionalUseCase } from '../../../core/application/use-cases/disponibilidade-profissional/DeleteDisponibilidadeProfissionalUseCase';

const disponibilidadeBodySchema = z.object({
  profissionalId: z.string().uuid(),
  diaSemana: z.number().int().min(0).max(6).nullable().optional(),
  dataEspecifica: z.coerce.date().nullable().optional(),
  horaInicio: z.coerce.date(),
  horaFim: z.coerce.date(),
  observacao: z.string().nullable().optional(),
  tipo: z.string().default('disponivel'),
});

export class DisponibilidadesProfissionaisController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const data = disponibilidadeBodySchema.parse(request.body);
      const useCase = container.resolve(CreateDisponibilidadeProfissionalUseCase);
      const disponibilidade = await useCase.execute(data);
      return reply.status(201).send(disponibilidade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ 
          message: 'Dados inválidos', 
          errors: error.errors 
        });
      }
      
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ 
          message: error.message 
        });
      }
      
      return reply.status(500).send({ 
        message: 'Erro interno do servidor', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const data = disponibilidadeBodySchema.partial().parse(request.body);
      const useCase = container.resolve(UpdateDisponibilidadeProfissionalUseCase);
      const disponibilidade = await useCase.execute(id, data);
      return reply.status(200).send(disponibilidade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ 
          message: 'Dados inválidos', 
          errors: error.errors 
        });
      }
      
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ 
          message: error.message 
        });
      }
      
      return reply.status(500).send({ 
        message: 'Erro interno do servidor', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const querySchema = z.object({
        profissionalId: z.string().uuid().optional(),
        diaSemana: z.coerce.number().int().min(0).max(6).optional(),
      });
      const filters = querySchema.parse(request.query);
      const useCase = container.resolve(ListDisponibilidadesProfissionaisUseCase);
      const disponibilidades = await useCase.execute(filters);
      return reply.status(200).send(disponibilidades);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ 
          message: 'Dados inválidos', 
          errors: error.errors 
        });
      }
      
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ 
          message: error.message 
        });
      }
      
      return reply.status(500).send({ 
        message: 'Erro interno do servidor', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const useCase = container.resolve(DeleteDisponibilidadeProfissionalUseCase);
      await useCase.execute(id);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ 
          message: 'Dados inválidos', 
          errors: error.errors 
        });
      }
      
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ 
          message: error.message 
        });
      }
      
      return reply.status(500).send({ 
        message: 'Erro interno do servidor', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
} 