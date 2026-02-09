import { inject, injectable } from 'tsyringe';
import { IRefreshTokensRepository } from '../../../domain/repositories/IRefreshTokensRepository';

@injectable()
export class LogoutUserUseCase {
  constructor(
    @inject('RefreshTokensRepository')
    private refreshTokensRepository: IRefreshTokensRepository
  ) {}

  async execute(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const token = await this.refreshTokensRepository.findByToken(refreshToken);
    if (!token) {
      return;
    }

    await this.refreshTokensRepository.delete(token.id);
    return;
  }
}
