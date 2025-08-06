import { injectable, inject } from 'tsyringe';
import { IRoleRoutesRepository } from '../../../domain/repositories/IRoleRoutesRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface IRequest {
  roleId: string;
  routeId: string;
}

@injectable()
export class RemoveRouteFromRoleUseCase {
  constructor(
    @inject('RoleRoutesRepository')
    private roleRoutesRepository: IRoleRoutesRepository
  ) {}

  async execute({ roleId, routeId }: IRequest): Promise<void> {
    const roleRoute = await this.roleRoutesRepository.findByRoleAndRoute(roleId, routeId);
    
    if (!roleRoute) {
      throw new AppError('Role não possui acesso a esta rota', 404);
    }

    await this.roleRoutesRepository.deleteByRoleAndRoute(roleId, routeId);
  }
}