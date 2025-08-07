import { inject, injectable } from 'tsyringe';
import { IUserRolesRepository } from '../../../domain/repositories/IUserRolesRepository';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { IRolesRepository } from '../../../domain/repositories/IRolesRepository';

interface ListAllUserRolesResponse {
  id: string;
  userId: string;
  roleId: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    nome: string;
    email: string;
  };
  role?: {
    nome: string;
    descricao?: string;
  };
}

@injectable()
export class ListAllUserRolesUseCase {
  constructor(
    @inject('UserRolesRepository')
    private userRolesRepository: IUserRolesRepository,
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,
    @inject('RolesRepository')
    private rolesRepository: IRolesRepository
  ) {}

  async execute(): Promise<ListAllUserRolesResponse[]> {
    // Buscar todas as user-roles
    const userRoles = await this.userRolesRepository.findAll();

    // Buscar dados relacionados para cada user-role
    const userRolesWithRelations = await Promise.all(
      userRoles.map(async (userRole) => {
        // Buscar dados do usuário
        const user = await this.usersRepository.findById(userRole.userId);
        
        // Buscar dados da role
        const role = await this.rolesRepository.findById(userRole.roleId);

        return {
          id: userRole.id,
          userId: userRole.userId,
          roleId: userRole.roleId,
          ativo: userRole.ativo,
          createdAt: userRole.createdAt,
          updatedAt: userRole.updatedAt,
          user: user ? {
            nome: user.nome,
            email: user.email,
          } : undefined,
          role: role ? {
            nome: role.nome,
            descricao: role.descricao,
          } : undefined,
        };
      })
    );

    return userRolesWithRelations;
  }
}