import { injectable, inject } from 'tsyringe';
import { Role } from '../../../domain/entities/Role';
import { IRolesRepository } from '../../../domain/repositories/IRolesRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface IRequest {
  nome: string;
  descricao?: string;
}

@injectable()
export class CreateRoleUseCase {
  constructor(
    @inject('RolesRepository')
    private rolesRepository: IRolesRepository
  ) {}

  async execute({ nome, descricao }: IRequest): Promise<Role> {
    const existingRole = await this.rolesRepository.findByNome(nome);

    if (existingRole) {
      throw new AppError('Já existe uma role com este nome', 409);
    }

    const role = new Role({
      nome,
      descricao,
      ativo: true,
    });

    return await this.rolesRepository.create(role);
  }
}