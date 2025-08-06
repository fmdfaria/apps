import { injectable, inject } from 'tsyringe';
import { RoleRoute } from '../../../domain/entities/RoleRoute';
import { IRoleRoutesRepository } from '../../../domain/repositories/IRoleRoutesRepository';
import { IRolesRepository } from '../../../domain/repositories/IRolesRepository';
import { IRoutesRepository } from '../../../domain/repositories/IRoutesRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface IRequest {
  roleId: string;
  routeId: string;
}

@injectable()
export class AssignRouteToRoleUseCase {
  constructor(
    @inject('RoleRoutesRepository')
    private roleRoutesRepository: IRoleRoutesRepository,
    @inject('RolesRepository')
    private rolesRepository: IRolesRepository,
    @inject('RoutesRepository')
    private routesRepository: IRoutesRepository
  ) {}

  async execute({ roleId, routeId }: IRequest): Promise<RoleRoute> {
    const role = await this.rolesRepository.findById(roleId);
    if (!role) {
      throw new AppError('Role não encontrada', 404);
    }

    const route = await this.routesRepository.findById(routeId);
    if (!route) {
      throw new AppError('Rota não encontrada', 404);
    }

    if (!role.ativo) {
      throw new AppError('Não é possível associar rota a uma role inativa', 409);
    }

    if (!route.ativo) {
      throw new AppError('Não é possível associar uma rota inativa', 409);
    }

    const existingRoleRoute = await this.roleRoutesRepository.findByRoleAndRoute(roleId, routeId);
    
    if (existingRoleRoute) {
      if (existingRoleRoute.ativo) {
        throw new AppError('Role já possui acesso a esta rota', 409);
      } else {
        existingRoleRoute.ativo = true;
        existingRoleRoute.updatedAt = new Date();
        return await this.roleRoutesRepository.update(existingRoleRoute);
      }
    }

    const roleRoute = new RoleRoute({
      roleId,
      routeId,
      ativo: true,
    });

    return await this.roleRoutesRepository.create(roleRoute);
  }
}