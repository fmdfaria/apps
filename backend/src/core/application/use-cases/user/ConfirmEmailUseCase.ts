import { inject, injectable } from 'tsyringe';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface IRequest {
  token: string;
}

@injectable()
export class ConfirmEmailUseCase {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  async execute({ token }: IRequest): Promise<void> {
    const users = await this.usersRepository.list();
    const user = users.find((u: any) => u.emailConfirmationToken === token);
    if (!user) {
      throw new AppError('Token de confirmação inválido.', 400);
    }
    await this.usersRepository.update(user.id, {
      emailConfirmed: true,
      emailConfirmationToken: null,
    } as any);
  }
} 