import { FastifyInstance } from 'fastify';
import { BancosController } from '../controllers/BancosController';

const bancosController = new BancosController();

export async function bancosRoutes(app: FastifyInstance) {
  // GET /bancos - Listar todos os bancos
  app.get('/bancos', bancosController.index);
  
  // POST /bancos - Criar novo banco
  app.post('/bancos', bancosController.create);
  
  // PUT /bancos/:id - Atualizar banco
  app.put('/bancos/:id', bancosController.update);
  
  // DELETE /bancos/:id - Deletar banco
  app.delete('/bancos/:id', bancosController.delete);
}