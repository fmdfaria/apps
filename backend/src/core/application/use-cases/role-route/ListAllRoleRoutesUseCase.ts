import { inject, injectable } from 'tsyringe';
import { IRoleRoutesRepository } from '../../../domain/repositories/IRoleRoutesRepository';
import { IRolesRepository } from '../../../domain/repositories/IRolesRepository';
import { IRoutesRepository } from '../../../domain/repositories/IRoutesRepository';

interface ListAllRoleRoutesResponse {
  id: string;
  roleId: string;
  routeId: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
  role?: {
    nome: string;
    descricao?: string;
  };
  route?: {
    nome: string;
    path: string;
    method: string;
    modulo?: string;
  };
}

@injectable()
export class ListAllRoleRoutesUseCase {
  constructor(
    @inject('RoleRoutesRepository')
    private roleRoutesRepository: IRoleRoutesRepository,
    @inject('RolesRepository')
    private rolesRepository: IRolesRepository,
    @inject('RoutesRepository')
    private routesRepository: IRoutesRepository
  ) {}

  async execute(): Promise<ListAllRoleRoutesResponse[]> {
    // Buscar todas as role-routes
    const roleRoutes = await this.roleRoutesRepository.findAll();

    // Buscar dados relacionados para cada role-route
    const roleRoutesWithRelations = await Promise.all(
      roleRoutes.map(async (roleRoute) => {
        // Buscar dados da role
        const role = await this.rolesRepository.findById(roleRoute.roleId);
        
        // Buscar dados da route
        const route = await this.routesRepository.findById(roleRoute.routeId);

        return {
          id: roleRoute.id,
          roleId: roleRoute.roleId,
          routeId: roleRoute.routeId,
          ativo: roleRoute.ativo,
          createdAt: roleRoute.createdAt,
          updatedAt: roleRoute.updatedAt,
          role: role ? {
            nome: role.nome,
            descricao: role.descricao,
          } : undefined,
          route: route ? {
            nome: route.nome,
            path: route.path,
            method: route.method,
            modulo: route.modulo,
          } : undefined,
        };
      })
    );

    return roleRoutesWithRelations;
  }
}