import { inject, injectable } from 'tsyringe';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { User, UserType } from '../../../domain/entities/User';

interface IRequest {
  tipo?: UserType;
  ativo?: boolean;
  email?: string;
  nome?: string;
}

@injectable()
export class ListUsersUseCase {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository
  ) {}

  async execute(filters: IRequest): Promise<Omit<User, 'senha'>[]> {
    const users = await this.usersRepository.list(filters);
    return users.map(({ senha, ...rest }) => rest);
  }
} 