import { injectable, inject } from 'tsyringe';
import { UserRole } from '../../../domain/entities/UserRole';
import { IUserRolesRepository } from '../../../domain/repositories/IUserRolesRepository';
import { IRolesRepository } from '../../../domain/repositories/IRolesRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface IRequest {
  userId: string;
  roleId: string;
}

@injectable()
export class AssignRoleToUserUseCase {
  constructor(
    @inject('UserRolesRepository')
    private userRolesRepository: IUserRolesRepository,
    @inject('RolesRepository')
    private rolesRepository: IRolesRepository
  ) {}

  async execute({ userId, roleId }: IRequest): Promise<UserRole> {
    const role = await this.rolesRepository.findById(roleId);
    if (!role) {
      throw new AppError('Role não encontrada', 404);
    }

    if (!role.ativo) {
      throw new AppError('Não é possível associar uma role inativa', 409);
    }

    const existingUserRole = await this.userRolesRepository.findByUserAndRole(userId, roleId);
    
    if (existingUserRole) {
      if (existingUserRole.ativo) {
        throw new AppError('Usuário já possui esta role', 409);
      } else {
        existingUserRole.ativo = true;
        existingUserRole.updatedAt = new Date();
        return await this.userRolesRepository.update(existingUserRole);
      }
    }

    const userRole = new UserRole({
      userId,
      roleId,
      ativo: true,
    });

    return await this.userRolesRepository.create(userRole);
  }
}