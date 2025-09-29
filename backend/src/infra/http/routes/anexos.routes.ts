import { FastifyInstance } from 'fastify';
import { AnexosController } from '../controllers/AnexosController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';

const controller = new AnexosController();

export async function anexosRoutes(app: FastifyInstance) {
  app.post('/anexos', { preHandler: [ensureAuthenticated] }, async (request, reply) => {
    try {
      return await controller.create(request, reply);
    } catch (error: any) {
      // Tratar erro de arquivo muito grande especificamente
      if (error.code === 'FST_REQ_FILE_TOO_LARGE' ||
          error.code === 'FST_ERR_CTP_BODY_TOO_LARGE' || 
          error.code === 'LIMIT_FILE_SIZE' ||
          error.message === 'request file too large' ||
          error.message?.includes('file too large')) {
        const limiteAnexo = Number(process.env.LIMITE_ANEXO || 10);
        return reply.status(413).send({ 
          message: `Arquivo muito grande. Tamanho máximo permitido: ${limiteAnexo}MB` 
        });
      }
      // Re-throw outros erros para serem tratados pelo handler global
      throw error;
    }
  });
  app.get('/anexos', { preHandler: [ensureAuthenticated] }, async (request, reply) => controller.list(request, reply));
  app.get('/anexos/:id/download', { preHandler: [ensureAuthenticated] }, async (request, reply) => controller.getDownloadUrl(request, reply));
  app.delete('/anexos/:id', { preHandler: [ensureAuthenticated] }, async (request, reply) => controller.delete(request, reply));
  app.put('/anexos/:id', { preHandler: [ensureAuthenticated] }, async (request, reply) => controller.update(request, reply));
  
  // Rota pública para logo da aplicação
  app.get('/logo', async (request, reply) => controller.getLogo(request, reply));
  
  // Rota pública para favicon da aplicação
  app.get('/favicon', async (request, reply) => controller.getFavicon(request, reply));
  
  // Rota para upload de avatar do usuário (protegida)
  app.post('/avatar', { preHandler: [ensureAuthenticated] }, async (request, reply) => {
    try {
      return await controller.uploadAvatar(request, reply);
    } catch (error: any) {
      // Tratar erro de arquivo muito grande especificamente
      if (error.code === 'FST_REQ_FILE_TOO_LARGE' ||
          error.code === 'FST_ERR_CTP_BODY_TOO_LARGE' || 
          error.code === 'LIMIT_FILE_SIZE' ||
          error.message === 'request file too large' ||
          error.message?.includes('file too large')) {
        const limiteAnexo = Number(process.env.LIMITE_ANEXO || 10);
        return reply.status(413).send({ 
          message: `Arquivo muito grande. Tamanho máximo permitido: ${limiteAnexo}MB` 
        });
      }
      // Re-throw outros erros para serem tratados pelo handler global
      throw error;
    }
  });
  
  // Rota para buscar URL do avatar do usuário (protegida)
  app.get('/avatar', { preHandler: [ensureAuthenticated] }, async (request, reply) => controller.getAvatarUrl(request, reply));
} 