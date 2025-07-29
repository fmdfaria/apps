import { inject, injectable } from 'tsyringe';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import crypto from 'crypto';

interface IRequest {
  userId: string;
}

@injectable()
export class RequestEmailConfirmationUseCase {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  async execute({ userId }: IRequest): Promise<void> {
    const token = crypto.randomBytes(32).toString('hex');
    await this.usersRepository.update(userId, {
      emailConfirmationToken: token,
    } as any);
    // Enviar e-mail (mock)
    // console.log(`Enviar e-mail de confirmação para o usuário com link: https://seusite.com/confirmar-email?token=${token}`);
  }
} 