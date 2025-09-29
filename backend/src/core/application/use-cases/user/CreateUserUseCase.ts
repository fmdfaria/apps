import { inject, injectable } from 'tsyringe';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { User } from '../../../domain/entities/User';
import { AppError } from '../../../../shared/errors/AppError';
import { generateSecurePassword } from '../../../../shared/utils/passwordGenerator';
import bcrypt from 'bcryptjs';

interface IRequest {
  nome: string;
  email: string;
  whatsapp: string;
  profissionalId?: string | null;
  pacienteId?: string | null;
}

interface IResponse {
  user: Omit<User, 'senha'>;
  senhaTemporaria: string;
}

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  async execute({ nome, email, whatsapp, profissionalId, pacienteId }: IRequest): Promise<IResponse> {
    const userExists = await this.usersRepository.findByEmail(email);
    if (userExists) {
      throw new AppError('E-mail já cadastrado.', 409);
    }
    
    // Gera senha temporária aleatória
    const senhaTemporaria = generateSecurePassword(10);
    const hashedPassword = await bcrypt.hash(senhaTemporaria, 10);
    
    const user = await this.usersRepository.create({
      nome,
      email,
      whatsapp,
      senha: hashedPassword,
      ativo: true,
      primeiroLogin: false, // Novo usuário precisa fazer primeiro login
      profissionalId: profissionalId ?? null,
      pacienteId: pacienteId ?? null,
    });
    
    // Remove a senha do retorno por segurança
    const { senha: _, ...userSafe } = user;
    
    return {
      user: userSafe,
      senhaTemporaria // Retorna a senha em texto plano apenas para exibir ao admin
    };
  }
} 