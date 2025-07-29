import { inject, injectable } from 'tsyringe';
import { IRefreshTokensRepository } from '../../../domain/repositories/IRefreshTokensRepository';

interface IRequest {
  refreshToken: string;
}

@injectable()
export class LogoutUserUseCase {
  constructor(
    @inject('RefreshTokensRepository')
    private refreshTokensRepository: IRefreshTokensRepository
  ) {}

  async execute({ refreshToken }: IRequest): Promise<void> {
    const token = await this.refreshTokensRepository.findByToken(refreshToken);
    if (token) {
      await this.refreshTokensRepository.delete(token.id);
    }
  }
} 