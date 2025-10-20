import { FastifyInstance } from 'fastify';
import { PacientesPedidosController } from '../controllers/PacientesPedidosController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

export async function pacientesPedidosRoutes(fastify: FastifyInstance) {
  const controller = new PacientesPedidosController();

  // POST /pacientes/:pacienteId/pedidos - Criar pedido médico
  fastify.post(
    '/:pacienteId/pedidos',
    {
      preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes/:pacienteId/pedidos', 'POST')],
    },
    controller.create
  );

  // GET /pacientes/:pacienteId/pedidos - Listar pedidos médicos do paciente
  fastify.get(
    '/:pacienteId/pedidos',
    {
      preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes/:pacienteId/pedidos', 'GET')],
    },
    controller.list
  );

  // GET /pacientes/pedidos - Listar todos os pedidos médicos (otimizado para dashboards)
  fastify.get(
    '/pedidos',
    {
      preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes/pedidos', 'GET')],
    },
    controller.list
  );

  // GET /pacientes/pedidos/vencimentos - Listar pedidos por vencimento (para automação n8n)
  fastify.get(
    '/pedidos/vencimentos',
    {
      preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes/pedidos/vencimentos', 'GET')],
    },
    controller.listByVencimento
  );

  // PUT /pacientes/pedidos/:id/notificacao - Marcar pedido como notificado
  fastify.put(
    '/pedidos/:id/notificacao',
    {
      preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes/pedidos/:id/notificacao', 'PUT')],
    },
    controller.marcarNotificado
  );

  // PUT /pacientes/:pacienteId/pedidos/:id - Atualizar pedido médico
  fastify.put(
    '/:pacienteId/pedidos/:id',
    {
      preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes/:pacienteId/pedidos/:id', 'PUT')],
    },
    controller.update
  );

  // DELETE /pacientes/:pacienteId/pedidos/:id - Excluir pedido médico
  fastify.delete(
    '/:pacienteId/pedidos/:id',
    {
      preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes/:pacienteId/pedidos/:id', 'DELETE')],
    },
    controller.delete
  );
}