import { injectable, inject } from 'tsyringe';
import { IUserRolesRepository } from '../../../domain/repositories/IUserRolesRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface IRequest {
  userId: string;
  roleId: string;
}

@injectable()
export class RemoveRoleFromUserUseCase {
  constructor(
    @inject('UserRolesRepository')
    private userRolesRepository: IUserRolesRepository
  ) {}

  async execute({ userId, roleId }: IRequest): Promise<void> {
    const userRole = await this.userRolesRepository.findByUserAndRole(userId, roleId);
    
    if (!userRole) {
      throw new AppError('Usuário não possui esta role', 404);
    }

    await this.userRolesRepository.deleteByUserAndRole(userId, roleId);
  }
}