import { injectable, inject } from 'tsyringe';
import { IUserRolesRepository } from '../../../domain/repositories/IUserRolesRepository';

interface IRequest {
  userId: string;
  onlyActive?: boolean;
}

@injectable()
export class ListUserRolesUseCase {
  constructor(
    @inject('UserRolesRepository')
    private userRolesRepository: IUserRolesRepository
  ) {}

  async execute({ userId, onlyActive = false }: IRequest) {
    if (onlyActive) {
      return await this.userRolesRepository.findActiveUserRoles(userId);
    }

    return await this.userRolesRepository.findByUserId(userId);
  }
}