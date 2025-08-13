import { inject, injectable } from 'tsyringe';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { AppError } from '../../../../shared/errors/AppError';
import bcrypt from 'bcryptjs';

interface IRequest {
  userId: string;
  senhaAtual: string;
  novaSenha: string;
}

@injectable()
export class ChangePasswordUseCase {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  async execute({ userId, senhaAtual, novaSenha }: IRequest): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    if (novaSenha.length < 8) {
      throw new AppError('Nova senha deve ter no mínimo 8 caracteres.', 400);
    }

    const passwordMatch = await bcrypt.compare(senhaAtual, user.senha);
    if (!passwordMatch) {
      throw new AppError('Senha atual incorreta.', 400);
    }

    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    await this.usersRepository.update(userId, { senha: hashedPassword });
  }
} 