import { RefreshToken } from '../entities/RefreshToken';

export interface IRefreshTokensRepository {
  create(data: Omit<RefreshToken, 'id' | 'criadoEm'>): Promise<RefreshToken>;
  findByToken(token: string): Promise<RefreshToken | null>;
  findByUserId(userId: string): Promise<RefreshToken[]>;
  delete(id: string): Promise<void>;
  deleteAllByUserId(userId: string): Promise<void>;
} 