import { injectable, inject } from 'tsyringe';
import { Role } from '../../../domain/entities/Role';
import { IRolesRepository } from '../../../domain/repositories/IRolesRepository';

interface IRequest {
  onlyActive?: boolean;
}

@injectable()
export class ListRolesUseCase {
  constructor(
    @inject('RolesRepository')
    private rolesRepository: IRolesRepository
  ) {}

  async execute({ onlyActive = false }: IRequest = {}): Promise<Role[]> {
    if (onlyActive) {
      return await this.rolesRepository.findActiveRoles();
    }

    return await this.rolesRepository.findAll();
  }
}