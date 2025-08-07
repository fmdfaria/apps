import { inject, injectable } from 'tsyringe';
import { IUserRolesRepository } from '../../../domain/repositories/IUserRolesRepository';
import { UserRole } from '../../../domain/entities/UserRole';

interface UpdateUserRoleRequest {
  id: string;
  ativo?: boolean;
}

interface UpdateUserRoleResponse {
  id: string;
  userId: string;
  roleId: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class UpdateUserRoleUseCase {
  constructor(
    @inject('UserRolesRepository')
    private userRolesRepository: IUserRolesRepository
  ) {}

  async execute({ id, ativo }: UpdateUserRoleRequest): Promise<UpdateUserRoleResponse> {
    // Buscar a user-role existente
    const existingUserRole = await this.userRolesRepository.findById(id);
    
    if (!existingUserRole) {
      throw new Error('Atribuição de usuário não encontrada');
    }

    // Atualizar apenas os campos fornecidos
    if (ativo !== undefined) {
      existingUserRole.ativo = ativo;
    }
    
    existingUserRole.updatedAt = new Date();

    // Salvar as alterações
    const updatedUserRole = await this.userRolesRepository.update(existingUserRole);

    return {
      id: updatedUserRole.id,
      userId: updatedUserRole.userId,
      roleId: updatedUserRole.roleId,
      ativo: updatedUserRole.ativo,
      createdAt: updatedUserRole.createdAt,
      updatedAt: updatedUserRole.updatedAt,
    };
  }
}