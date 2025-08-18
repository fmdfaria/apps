import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { ListUsersUseCase } from '../../../core/application/use-cases/user/ListUsersUseCase';
import { UpdateUserUseCase } from '../../../core/application/use-cases/user/UpdateUserUseCase';
import { DeleteUserUseCase } from '../../../core/application/use-cases/user/DeleteUserUseCase';
import { IUsersRepository } from '../../../core/domain/repositories/IUsersRepository';

export class UsersController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
      ativo: z.coerce.boolean().optional(),
      email: z.string().email().optional(),
      nome: z.string().optional(),
    });
    const filters = querySchema.parse(request.query);
    const useCase = container.resolve(ListUsersUseCase);
    const users = await useCase.execute(filters);
    return reply.send(users);
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      nome: z.string().min(3).optional(),
      email: z.string().email().optional(),
      whatsapp: z.string().min(12).max(14).regex(/^55\d{2}9?\d{8,9}$/, 'Formato de WhatsApp inválido. Use: 551199999999, 5511999999999 ou 55119999999999').optional(),
      ativo: z.boolean().optional(),
      profissionalId: z.string().uuid().optional(),
      pacienteId: z.string().uuid().optional(),
    });
    const { id } = paramsSchema.parse(request.params);
    const data = bodySchema.parse(request.body);
    const useCase = container.resolve(UpdateUserUseCase);
    await useCase.execute({ userId: id, ...data });
    return reply.status(204).send();
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const querySchema = z.object({ hardDelete: z.coerce.boolean().optional() });
    const { id } = paramsSchema.parse(request.params);
    const { hardDelete } = querySchema.parse(request.query);
    const useCase = container.resolve(DeleteUserUseCase);
    await useCase.execute({ userId: id, hardDelete });
    return reply.status(204).send();
  }

  async show(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const usersRepository = container.resolve<IUsersRepository>('UsersRepository');
    const user = await usersRepository.findById(id);
    if (!user) {
      return reply.status(404).send({ message: 'Usuário não encontrado.' });
    }
    // Remove o campo senha
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { senha, ...userWithoutSenha } = user;
    return reply.send(userWithoutSenha);
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    // @ts-ignore
    const userId = request.user?.id;
    
    if (!userId) {
      return reply.status(401).send({ message: 'Usuário não autenticado.' });
    }

    try {
      const usersRepository = container.resolve<IUsersRepository>('UsersRepository');
      const user = await usersRepository.findById(userId);
      
      if (!user) {
        return reply.status(404).send({ message: 'Usuário não encontrado.' });
      }

      // Remove o campo senha
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { senha, ...userWithoutSenha } = user;
      
      return reply.send(userWithoutSenha);
    } catch (error) {
      console.error('Erro ao buscar dados do usuário logado:', error);
      return reply.status(500).send({ message: 'Erro interno do servidor.' });
    }
  }
} 