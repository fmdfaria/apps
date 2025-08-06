import { injectable, inject } from 'tsyringe';
import { IRolesRepository } from '../../../domain/repositories/IRolesRepository';
import { IUserRolesRepository } from '../../../domain/repositories/IUserRolesRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface IRequest {
  id: string;
}

@injectable()
export class DeleteRoleUseCase {
  constructor(
    @inject('RolesRepository')
    private rolesRepository: IRolesRepository,
    @inject('UserRolesRepository')
    private userRolesRepository: IUserRolesRepository
  ) {}

  async execute({ id }: IRequest): Promise<void> {
    const role = await this.rolesRepository.findById(id);

    if (!role) {
      throw new AppError('Role não encontrada', 404);
    }

    const userRoles = await this.userRolesRepository.findByRoleId(id);
    
    if (userRoles.length > 0) {
      throw new AppError('Não é possível deletar a role pois existem usuários associados a ela', 409);
    }

    await this.rolesRepository.delete(id);
  }
}