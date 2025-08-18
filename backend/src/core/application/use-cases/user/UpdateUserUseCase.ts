import { inject, injectable } from 'tsyringe';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface IRequest {
  userId: string;
  nome?: string;
  email?: string;
  whatsapp?: string;
  ativo?: boolean;
  profissionalId?: string;
  pacienteId?: string;
}

@injectable()
export class UpdateUserUseCase {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  async execute({ userId, ...data }: IRequest): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new AppError('Usuário não encontrado.', 404);
    }
    await this.usersRepository.update(userId, data);
  }
} 