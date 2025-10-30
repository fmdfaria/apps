import { inject, injectable } from 'tsyringe';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { IUserRolesRepository } from '../../../domain/repositories/IUserRolesRepository';
import { AppError } from '../../../../shared/errors/AppError';
import { isPasswordSecure } from '../../../../shared/utils/passwordGenerator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface IRequest {
  email: string;
  senhaAtual: string;
  novaSenha: string;
  ip?: string;
  userAgent?: string;
}

interface IResponse {
  message: string;
  accessToken: string;
  user: {
    id: string;
    nome: string;
    email: string;
    whatsapp: string;
    ativo: boolean;
    primeiroLogin: boolean;
    roles: string[];
  };
}

@injectable()
export class FirstLoginUseCase {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,
    @inject('UserRolesRepository')
    private userRolesRepository: IUserRolesRepository
  ) {}

  async execute({ email, senhaAtual, novaSenha, ip, userAgent }: IRequest): Promise<IResponse> {
    // Busca usuário por email
    const user = await this.usersRepository.findByEmail(email);
    if (!user || !user.ativo) {
      throw new AppError('Credenciais inválidas.', 401);
    }

    // Verifica se é realmente o primeiro login (deve ser false para permitir primeiro login)
    if (user.primeiroLogin) {
      throw new AppError('Este usuário já realizou o primeiro login.', 400);
    }

    // Verifica se a senha atual está correta
    const passwordMatch = await bcrypt.compare(senhaAtual, user.senha);
    if (!passwordMatch) {
      throw new AppError('Senha atual incorreta.', 401);
    }

    // Valida se a nova senha atende aos critérios de segurança
    if (!isPasswordSecure(novaSenha)) {
      throw new AppError(
        'A nova senha deve ter pelo menos 8 caracteres.',
        400
      );
    }

    // Criptografa a nova senha
    const hashedNewPassword = await bcrypt.hash(novaSenha, 10);

    // Atualiza a senha e marca que já fez o primeiro login
    await this.usersRepository.update(user.id, {
      senha: hashedNewPassword,
      primeiroLogin: true,
    });

    // Buscar roles do usuário com nomes
    const userRoles = await this.userRolesRepository.findActiveUserRolesWithNames(user.id);
    const roleNames = userRoles.map(ur => ur.roleName);

    // Gera access token JWT para autenticação
    const accessToken = jwt.sign(
      { sub: user.id, roles: roleNames },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    return {
      message: 'Primeiro login realizado com sucesso. Senha alterada.',
      accessToken,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        whatsapp: user.whatsapp,
        ativo: user.ativo,
        primeiroLogin: true,
        roles: roleNames,
      },
    };
  }
}