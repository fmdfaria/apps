import { inject, injectable } from 'tsyringe';
import { IRoleRoutesRepository } from '../../../domain/repositories/IRoleRoutesRepository';
import { RoleRoute } from '../../../domain/entities/RoleRoute';

interface UpdateRoleRouteRequest {
  id: string;
  ativo?: boolean;
}

interface UpdateRoleRouteResponse {
  id: string;
  roleId: string;
  routeId: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class UpdateRoleRouteUseCase {
  constructor(
    @inject('RoleRoutesRepository')
    private roleRoutesRepository: IRoleRoutesRepository
  ) {}

  async execute({ id, ativo }: UpdateRoleRouteRequest): Promise<UpdateRoleRouteResponse> {
    // Buscar a role-route existente
    const existingRoleRoute = await this.roleRoutesRepository.findById(id);
    
    if (!existingRoleRoute) {
      throw new Error('Associação de role-route não encontrada');
    }

    // Atualizar apenas os campos fornecidos
    if (ativo !== undefined) {
      existingRoleRoute.ativo = ativo;
    }
    
    existingRoleRoute.updatedAt = new Date();

    // Salvar as alterações
    const updatedRoleRoute = await this.roleRoutesRepository.update(existingRoleRoute);

    return {
      id: updatedRoleRoute.id,
      roleId: updatedRoleRoute.roleId,
      routeId: updatedRoleRoute.routeId,
      ativo: updatedRoleRoute.ativo,
      createdAt: updatedRoleRoute.createdAt,
      updatedAt: updatedRoleRoute.updatedAt,
    };
  }
}