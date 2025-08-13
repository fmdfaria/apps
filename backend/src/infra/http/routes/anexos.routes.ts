import { FastifyInstance } from 'fastify';
import { AnexosController } from '../controllers/AnexosController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';

const controller = new AnexosController();

export async function anexosRoutes(app: FastifyInstance) {
  app.post('/anexos', { preHandler: [ensureAuthenticated] }, async (request, reply) => controller.create(request, reply));
  app.get('/anexos', { preHandler: [ensureAuthenticated] }, async (request, reply) => controller.list(request, reply));
  app.get('/anexos/:id/download', { preHandler: [ensureAuthenticated] }, async (request, reply) => controller.getDownloadUrl(request, reply));
  app.delete('/anexos/:id', { preHandler: [ensureAuthenticated] }, async (request, reply) => controller.delete(request, reply));
  app.put('/anexos/:id', { preHandler: [ensureAuthenticated] }, async (request, reply) => controller.update(request, reply));
  
  // Rota pública para logo da aplicação
  app.get('/logo', async (request, reply) => controller.getLogo(request, reply));
} 