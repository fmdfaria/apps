import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateUserUseCase } from '../../../core/application/use-cases/user/CreateUserUseCase';
import { AuthenticateUserUseCase } from '../../../core/application/use-cases/user/AuthenticateUserUseCase';
import { LogoutUserUseCase } from '../../../core/application/use-cases/user/LogoutUserUseCase';
import { RequestPasswordResetUseCase } from '../../../core/application/use-cases/user/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '../../../core/application/use-cases/user/ResetPasswordUseCase';
import { ChangePasswordUseCase } from '../../../core/application/use-cases/user/ChangePasswordUseCase';
import { RequestEmailConfirmationUseCase } from '../../../core/application/use-cases/user/RequestEmailConfirmationUseCase';
import { ConfirmEmailUseCase } from '../../../core/application/use-cases/user/ConfirmEmailUseCase';
import { FirstLoginUseCase } from '../../../core/application/use-cases/user/FirstLoginUseCase';

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({
      nome: z.string().min(3),
      email: z.string().email(),
      whatsapp: z.string().min(12).max(14).regex(/^55\d{2}9?\d{8,9}$/, 'Formato de WhatsApp inválido. Use: 551199999999, 5511999999999 ou 55119999999999'),
      profissionalId: z.string().uuid().nullish(),
      pacienteId: z.string().uuid().nullish(),
    });
    const data = bodySchema.parse(request.body);
    const useCase = container.resolve(CreateUserUseCase);
    const result = await useCase.execute(data);
    return reply.status(201).send(result);
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({
      email: z.string().email(),
      senha: z.string().min(6),
    });
    const { email, senha } = bodySchema.parse(request.body);
    const useCase = container.resolve(AuthenticateUserUseCase);
    const result = await useCase.execute({ email, senha, ip: request.ip, userAgent: request.headers['user-agent'] });
    return reply.send(result);
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const useCase = container.resolve(LogoutUserUseCase);
    await useCase.execute();
    return reply.status(204).send();
  }

  async requestPasswordReset(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({ email: z.string().email() });
    const { email } = bodySchema.parse(request.body);
    const useCase = container.resolve(RequestPasswordResetUseCase);
    const result = await useCase.execute({ email });
    
    if (result) {
      // Se usuário existe, retorna os dados para o frontend enviar webhook
      return reply.send(result);
    } else {
      // Mesmo que usuário não exista, retorna 204 para não revelar informação
      return reply.status(204).send();
    }
  }

  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({ token: z.string(), novaSenha: z.string().min(6) });
    const { token, novaSenha } = bodySchema.parse(request.body);
    const useCase = container.resolve(ResetPasswordUseCase);
    await useCase.execute({ token, novaSenha });
    return reply.status(204).send();
  }

  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({ senhaAtual: z.string().min(6), novaSenha: z.string().min(8) });
    const { senhaAtual, novaSenha } = bodySchema.parse(request.body);
    // userId deve vir do token (middleware de autenticação)
    // @ts-ignore
    const userId = request.user.id;
    const useCase = container.resolve(ChangePasswordUseCase);
    await useCase.execute({ userId, senhaAtual, novaSenha });
    return reply.status(204).send();
  }

  async requestEmailConfirmation(request: FastifyRequest, reply: FastifyReply) {
    // userId deve vir do token (middleware de autenticação)
    // @ts-ignore
    const userId = request.user.id;
    const useCase = container.resolve(RequestEmailConfirmationUseCase);
    await useCase.execute({ userId });
    return reply.status(204).send();
  }

  async confirmEmail(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({ token: z.string() });
    const { token } = bodySchema.parse(request.body);
    const useCase = container.resolve(ConfirmEmailUseCase);
    await useCase.execute({ token });
    return reply.status(204).send();
  }

  async firstLogin(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({
      email: z.string().email(),
      senhaAtual: z.string().min(1),
      novaSenha: z.string().min(8),
    });
    const { email, senhaAtual, novaSenha } = bodySchema.parse(request.body);
    const useCase = container.resolve(FirstLoginUseCase);
    const result = await useCase.execute({
      email,
      senhaAtual,
      novaSenha,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return reply.send(result);
  }

  // Endpoint temporário para testar variáveis de ambiente
  async testWebhook(request: FastifyRequest, reply: FastifyReply) {
    const webhookUrl = process.env.WEBHOOK_PASSWORD_RESET;
    return reply.send({
      webhook_url: webhookUrl || 'Não configurado',
      env_loaded: !!process.env.DATABASE_URL // Verifica se .env está carregado
    });
  }
} 