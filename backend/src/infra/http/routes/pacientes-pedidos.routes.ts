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