import { FastifyInstance } from 'fastify';
import * as PrecosParticularesController from '../controllers/PrecosParticularesController';

export async function precosParticularesRoutes(app: FastifyInstance) {
  app.post('/precos-particulares', PrecosParticularesController.create);
  app.put('/precos-particulares/:id', PrecosParticularesController.update);
  app.get('/precos-particulares', PrecosParticularesController.list);
  app.delete('/precos-particulares/:id', PrecosParticularesController.remove);
} 