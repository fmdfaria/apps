import { FastifyRequest, FastifyReply } from 'fastify';

export async function ensureAdmin(request: FastifyRequest, reply: FastifyReply) {
  // @ts-ignore
  if (!request.user || request.user.tipo !== 'ADMIN') {
    return reply.status(403).send({ message: 'Acesso restrito a administradores.' });
  }
} 