import { inject, injectable } from 'tsyringe';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { IRefreshTokensRepository } from '../../../domain/repositories/IRefreshTokensRepository';
import { AppError } from '../../../../shared/errors/AppError';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../../../domain/entities/User';
import { RefreshToken } from '../../../domain/entities/RefreshToken';

interface IRequest {
  email: string;
  senha: string;
  ip?: string;
  userAgent?: string;
}

interface IResponse {
  user: Omit<User, 'senha'>;
  accessToken: string;
  refreshToken: string;
}

@injectable()
export class AuthenticateUserUseCase {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,
    @inject('RefreshTokensRepository')
    private refreshTokensRepository: IRefreshTokensRepository
  ) {}

  async execute({ email, senha, ip, userAgent }: IRequest): Promise<IResponse> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user || !user.ativo) {
      throw new AppError('Usuário ou senha inválidos.', 401);
    }
    const passwordMatch = await bcrypt.compare(senha, user.senha);
    if (!passwordMatch) {
      throw new AppError('Usuário ou senha inválidos.', 401);
    }
    // Geração dos tokens
    const accessToken = jwt.sign(
      { sub: user.id, tipo: user.tipo },
      process.env.JWT_SECRET as string,
      { expiresIn: '15m' }
    );
    const refreshTokenValue = jwt.sign(
      { sub: user.id },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: '7d' }
    );
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
    await this.refreshTokensRepository.create({
      userId: user.id,
      token: refreshTokenValue,
      expiresAt,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
    // Não retornar a senha
    const { senha: _, ...userSafe } = user;
    return {
      user: userSafe,
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }
} 