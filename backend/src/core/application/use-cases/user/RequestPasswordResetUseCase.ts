import { inject, injectable } from 'tsyringe';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { AppError } from '../../../../shared/errors/AppError';
import { generateSecurePassword } from '../../../../shared/utils/passwordGenerator';
import bcrypt from 'bcryptjs';

interface IRequest {
  email: string;
}

interface IResponse {
  user: {
    nome: string;
    email: string;
    whatsapp: string;
  };
  senhaTemporaria: string;
}

@injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  async execute({ email }: IRequest): Promise<IResponse | null> {
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

      return {
        user: {
          nome: user.nome,
          email: user.email,
          whatsapp: user.whatsapp || ''
        },
        senhaTemporaria
      };
    }
    // Retorna null se usuário não encontrado (para não revelar se existe)
    return null;
  }
} 