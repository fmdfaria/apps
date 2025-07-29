import { FastifyInstance } from 'fastify';
import { ContratosProfissionaisController } from '../controllers/ContratosProfissionaisController';

const controller = new ContratosProfissionaisController();

export async function contratosProfissionaisRoutes(app: FastifyInstance) {
  app.post('/contratos-profissionais', controller.create);
  app.get('/contratos-profissionais', controller.list);
  app.put('/contratos-profissionais/:id', controller.update);
  app.delete('/contratos-profissionais/:id', controller.delete);
} 