import { inject, injectable } from 'tsyringe';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { AppError } from '../../../../shared/errors/AppError';
import crypto from 'crypto';

interface IRequest {
  email: string;
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
      // Gera token de reset
      const resetToken = crypto.randomBytes(32).toString('hex');
      // Salvar token e expiração (exemplo: campo resetToken/resetTokenExpires em User)
      await this.usersRepository.update(user.id, {
        resetToken,
        resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000), // 1h
      } as any);
      // Enviar e-mail (mock)
      // console.log(`Enviar e-mail para ${email} com link: https://seusite.com/resetar-senha?token=${resetToken}`);
    }
    // Sempre retorna sucesso para não revelar se o e-mail existe
  }
} 