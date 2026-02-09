import { inject, injectable } from 'tsyringe';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { IUserRolesRepository } from '../../../domain/repositories/IUserRolesRepository';
import { IRefreshTokensRepository } from '../../../domain/repositories/IRefreshTokensRepository';
import { AppError } from '../../../../shared/errors/AppError';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../../../domain/entities/User';

interface IRequest {
  email: string;
  senha: string;
  ip?: string;
  userAgent?: string;
}

interface IResponse {
  user: Omit<User, 'senha'> & { roles?: string[] };
  accessToken: string;
  refreshToken: string;
  requiresPasswordChange: boolean;
}

@injectable()
export class AuthenticateUserUseCase {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,
    @inject('UserRolesRepository')
    private userRolesRepository: IUserRolesRepository,
    @inject('RefreshTokensRepository')
    private refreshTokensRepository: IRefreshTokensRepository
  ) {}

  async execute({ email, senha, ip, userAgent }: IRequest): Promise<IResponse> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Usuário ou senha inválidos.', 401);
    }
    
    if (!user.ativo) {
      throw new AppError('Usuário inativo. Entre em contato com o administrador.', 401);
    }
    const passwordMatch = await bcrypt.compare(senha, user.senha);
    if (!passwordMatch) {
      throw new AppError('Usuário ou senha inválidos.', 401);
    }
    
    // Buscar roles do usuário com nomes
    const userRoles = await this.userRolesRepository.findActiveUserRolesWithNames(user.id);
    const roleNames = userRoles.map(ur => ur.roleName);

    // Geração do access token
    const accessToken = jwt.sign(
      { sub: user.id, roles: roleNames },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );
    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const refreshToken = jwt.sign(
      { sub: user.id },
      refreshTokenSecret as string,
      { expiresIn: '30d' }
    );
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.refreshTokensRepository.create({
      userId: user.id,
      token: refreshToken,
      expiresAt,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });

    // Não retornar a senha
    const { senha: _, ...userSafe } = user;
    return {
      user: { ...userSafe, roles: roleNames },
      accessToken,
      refreshToken,
      requiresPasswordChange: !user.primeiroLogin, // Indica se precisa trocar senha (false = precisa trocar)
    };
  }
}
