import { inject, injectable } from 'tsyringe';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { AppError } from '../../../../shared/errors/AppError';
import bcrypt from 'bcryptjs';

interface IRequest {
  token: string;
  novaSenha: string;
}

@injectable()
export class ResetPasswordUseCase {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  async execute({ token, novaSenha }: IRequest): Promise<void> {
    const users = await this.usersRepository.list();
    const user = users.find(
      (u: any) => u.resetToken === token && u.resetTokenExpires && u.resetTokenExpires > new Date()
    );
    if (!user) {
      throw new AppError('Token inválido ou expirado.', 400);
    }
    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    await this.usersRepository.update(user.id, {
      senha: hashedPassword,
      resetToken: null,
      resetTokenExpires: null,
    });
  }
} 