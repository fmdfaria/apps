import { inject, injectable } from 'tsyringe';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { AppError } from '../../../../shared/errors/AppError';
import { generateSecurePassword } from '../../../../shared/utils/passwordGenerator';
import bcrypt from 'bcryptjs';

interface IRequest {
  email: string;
}

interface IWebhookData {
  nome: string;
  email: string;
  whatsapp: string;
  senhaTemporaria: string;
  tipo: 'password_reset';
}

@injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  async execute({ email }: IRequest): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);
    if (user) {
      // Gerar nova senha temporária
      const senhaTemporaria = generateSecurePassword(10);
      const hashedPassword = await bcrypt.hash(senhaTemporaria, 10);
      
      // Atualizar senha no banco de dados
      await this.usersRepository.update(user.id, {
        senha: hashedPassword,
        primeiroLogin: false, // Usuário precisará fazer primeiro login novamente
        resetToken: null, // Limpar token anterior se existir
        resetTokenExpires: null
      });

      // Enviar webhook com os dados
      await this.sendWebhook({
        nome: user.nome,
        email: user.email,
        whatsapp: user.whatsapp || '',
        senhaTemporaria,
        tipo: 'password_reset'
      });
    }
    // Sempre retorna sucesso para não revelar se o e-mail existe
  }

  private async sendWebhook(data: IWebhookData): Promise<void> {
    const webhookUrl = process.env.WEBHOOK_PASSWORD_RESET;
    
    if (!webhookUrl) {
      console.warn('WEBHOOK_PASSWORD_RESET não configurado no .env');
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error('Erro ao enviar webhook:', response.status, response.statusText);
      } else {
        console.log('Webhook de reset de senha enviado com sucesso para:', data.email);
      }
    } catch (error) {
      console.error('Erro ao enviar webhook de reset de senha:', error);
    }
  }
} 