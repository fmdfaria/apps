import { FastifyInstance } from 'fastify';
import { BancosController } from '../controllers/BancosController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const bancosController = new BancosController();

export async function bancosRoutes(app: FastifyInstance) {
  // GET /bancos - Listar todos os bancos
  app.get('/bancos', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/bancos', 'GET')] 
  }, bancosController.index);
  
  // POST /bancos - Criar novo banco
  app.post('/bancos', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/bancos', 'POST')] 
  }, bancosController.create);
  
  // PUT /bancos/:id - Atualizar banco
  app.put('/bancos/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/bancos/:id', 'PUT')] 
  }, bancosController.update);
  
  // DELETE /bancos/:id - Deletar banco
  app.delete('/bancos/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/bancos/:id', 'DELETE')] 
  }, bancosController.delete);
}