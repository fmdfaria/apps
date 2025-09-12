import { FastifyInstance } from 'fastify';
import { CategoriasFinanceirasController } from '../controllers/CategoriasFinanceirasController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const controller = new CategoriasFinanceirasController();

export async function categoriasFinanceirasRoutes(app: FastifyInstance) {
  // Listar categorias financeiras
  app.get('/categorias-financeiras', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/categorias-financeiras', 'GET')] 
  }, (request, reply) => controller.list(request as any, reply as any));
  
  // Criar nova categoria financeira
  app.post('/categorias-financeiras', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/categorias-financeiras', 'POST')] 
  }, (request, reply) => controller.create(request as any, reply as any));
  
  // Buscar categoria financeira por ID
  app.get('/categorias-financeiras/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/categorias-financeiras/:id', 'GET')] 
  }, (request, reply) => controller.findById(request as any, reply as any));
  
  // Atualizar categoria financeira
  app.put('/categorias-financeiras/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/categorias-financeiras/:id', 'PUT')] 
  }, (request, reply) => controller.update(request as any, reply as any));

  // Excluir categoria financeira
  app.delete('/categorias-financeiras/:id', {
    preHandler: [ensureAuthenticated, ensureAuthorized('/categorias-financeiras/:id', 'DELETE')]
  }, (request, reply) => controller.delete(request as any, reply as any));

  // Por tipo (RECEITA/DESPESA)
  app.get('/categorias-financeiras/tipo/:tipo', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/categorias-financeiras/tipo/:tipo', 'GET')] 
  }, (request, reply) => controller.findByTipo(request as any, reply as any));
}