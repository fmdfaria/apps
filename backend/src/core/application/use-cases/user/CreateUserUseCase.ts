import { inject, injectable } from 'tsyringe';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { User } from '../../../domain/entities/User';
import { AppError } from '../../../../shared/errors/AppError';
import bcrypt from 'bcryptjs';

interface IRequest {
  nome: string;
  email: string;
  senha: string;
  profissionalId?: string;
  pacienteId?: string;
}

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  async execute({ nome, email, senha, profissionalId, pacienteId }: IRequest): Promise<User> {
    const userExists = await this.usersRepository.findByEmail(email);
    if (userExists) {
      throw new AppError('E-mail já cadastrado.', 409);
    }
    const hashedPassword = await bcrypt.hash(senha, 10);
    const user = await this.usersRepository.create({
      nome,
      email,
      senha: hashedPassword,
      ativo: true,
      profissionalId: profissionalId ?? null,
      pacienteId: pacienteId ?? null,
    });
    return user;
  }
} 