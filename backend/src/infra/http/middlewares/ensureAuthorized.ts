import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { ListUserAllowedRoutesUseCase } from '../../../core/application/use-cases/role-route/ListUserAllowedRoutesUseCase';

export function ensureAuthorized(requiredPath: string, method: string = 'GET') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // @ts-ignore
    const userId = request.user?.id;
    
    if (!userId) {
      return reply.status(401).send({ message: 'Usuário não autenticado.' });
    }

    try {
      const useCase = container.resolve(ListUserAllowedRoutesUseCase);
      const allowedRoutes = await useCase.execute({ userId });

      const hasAccess = allowedRoutes.some(route => {
        return route.path === requiredPath && route.method.toLowerCase() === method.toLowerCase();
      });

      if (!hasAccess) {
        return reply.status(403).send({ 
          message: 'Acesso negado. Usuário não possui permissão para esta rota.',
          requiredPath,
          method: method.toUpperCase(),
        });
      }
    } catch (error) {
      console.error('Erro ao verificar autorização:', error);
      return reply.status(500).send({ message: 'Erro interno do servidor.' });
    }
  };
}