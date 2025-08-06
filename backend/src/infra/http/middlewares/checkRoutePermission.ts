import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { ListUserAllowedRoutesUseCase } from '../../../core/application/use-cases/role-route/ListUserAllowedRoutesUseCase';

export async function checkRoutePermission(request: FastifyRequest, reply: FastifyReply) {
  // @ts-ignore
  const userId = request.user?.id;
  
  if (!userId) {
    return reply.status(401).send({ message: 'Usuário não autenticado.' });
  }

  const currentPath = request.routeOptions.url || request.url;
  const currentMethod = request.method;

  try {
    const useCase = container.resolve(ListUserAllowedRoutesUseCase);
    const allowedRoutes = await useCase.execute({ userId });

    const hasAccess = allowedRoutes.some(route => {
      const routePath = route.path.replace(/:[^/]+/g, '*');
      const matchPath = currentPath.replace(/\/[^/]+$/g, '/*').replace(/\/\d+/g, '/*');
      
      return (
        (routePath === route.path || routePath === matchPath || route.path === currentPath) &&
        route.method.toLowerCase() === currentMethod.toLowerCase()
      );
    });

    if (!hasAccess) {
      return reply.status(403).send({ 
        message: 'Acesso negado. Usuário não possui permissão para esta rota.',
        requiredPath: currentPath,
        method: currentMethod
      });
    }
  } catch (error) {
    console.error('Erro ao verificar autorização:', error);
    return reply.status(500).send({ message: 'Erro interno do servidor.' });
  }
}