import { inject, injectable } from 'tsyringe';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface IRequest {
  userId: string;
  hardDelete?: boolean;
}

@injectable()
export class DeleteUserUseCase {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  async execute({ userId, hardDelete }: IRequest): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new AppError('Usuário não encontrado.', 404);
    }
    if (hardDelete) {
      await this.usersRepository.delete(userId);
    } else {
      await this.usersRepository.update(userId, { ativo: false });
    }
  }
} 