import { inject, injectable } from 'tsyringe';
import { IRoleRoutesRepository } from '../../../domain/repositories/IRoleRoutesRepository';

interface DeleteRoleRouteRequest {
  id: string;
}

@injectable()
export class DeleteRoleRouteUseCase {
  constructor(
    @inject('RoleRoutesRepository')
    private roleRoutesRepository: IRoleRoutesRepository
  ) {}

  async execute({ id }: DeleteRoleRouteRequest): Promise<void> {
    // Buscar a role-route existente para verificar se existe
    const existingRoleRoute = await this.roleRoutesRepository.findById(id);
    
    if (!existingRoleRoute) {
      throw new Error('Associação de role-route não encontrada');
    }

    // Deletar a role-route
    await this.roleRoutesRepository.delete(id);
  }
}