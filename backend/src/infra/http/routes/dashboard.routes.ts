import { FastifyInstance } from 'fastify';
import { DashboardController } from '../controllers/DashboardController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { checkRoutePermission } from '../middlewares/checkRoutePermission';

export async function dashboardRoutes(fastify: FastifyInstance) {
  const dashboardController = new DashboardController();

  // Middleware de autenticação para todas as rotas
  fastify.addHook('preHandler', ensureAuthenticated);
  fastify.addHook('preHandler', checkRoutePermission);

  // GET /dashboard/ocupacao - Buscar dados de ocupação
  fastify.get('/ocupacao', {
    schema: {
      tags: ['Dashboard'],
      summary: 'Buscar dados de ocupação de profissionais e recursos',
      description: 'Retorna dados de ocupação calculados baseados nas disponibilidades reais dos profissionais e recursos nos próximos 7 dias',
      response: {
        200: {
          type: 'object',
          properties: {
            ocupacoesProfissionais: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  profissionalId: { type: 'string', format: 'uuid' },
                  nome: { type: 'string' },
                  ocupados: { type: 'number' },
                  total: { type: 'number' },
                  percentual: { type: 'number' },
                  agendamentosHoje: { type: 'number' },
                  agendamentosProximos7: { type: 'number' }
                }
              }
            },
            ocupacoesRecursos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  nome: { type: 'string' },
                  tipo: { type: 'string' },
                  agendamentosHoje: { type: 'number' },
                  agendamentosProximos7: { type: 'number' },
                  percentualOcupacao: { type: 'number' },
                  disponivel: { type: 'boolean' }
                }
              }
            }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, dashboardController.getOcupacao);
}