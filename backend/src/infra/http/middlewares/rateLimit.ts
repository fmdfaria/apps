import { FastifyRequest, FastifyReply } from 'fastify';

const attempts: Record<string, { count: number; last: number }> = {};
const WINDOW = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 5;

export async function rateLimit(request: FastifyRequest, reply: FastifyReply) {
  const ip = request.ip;
  const now = Date.now();
  if (!attempts[ip] || now - attempts[ip].last > WINDOW) {
    attempts[ip] = { count: 1, last: now };
  } else {
    attempts[ip].count++;
    attempts[ip].last = now;
  }
  if (attempts[ip].count > MAX_ATTEMPTS) {
    return reply.status(429).send({ message: 'Muitas tentativas. Tente novamente em alguns minutos.' });
  }
} 