import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

export async function ensureAuthenticated(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return reply.status(401).send({ message: 'Token não informado.' });
  }
  const [, token] = authHeader.split(' ');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    // @ts-ignore
    request.user = { id: decoded.sub, tipo: decoded.tipo, roles: decoded.roles || [] };
  } catch {
    return reply.status(401).send({ message: 'Token inválido.' });
  }
} 