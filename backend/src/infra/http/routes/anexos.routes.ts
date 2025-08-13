import { FastifyInstance } from 'fastify';
import { AnexosController } from '../controllers/AnexosController';

const controller = new AnexosController();

export async function anexosRoutes(app: FastifyInstance) {
  app.post('/anexos', async (request, reply) => controller.create(request, reply));
  app.get('/anexos', async (request, reply) => controller.list(request, reply));
  app.get('/anexos/:id/download', async (request, reply) => controller.getDownloadUrl(request, reply));
  app.delete('/anexos/:id', async (request, reply) => controller.delete(request, reply));
  app.put('/anexos/:id', async (request, reply) => controller.update(request, reply));
} 