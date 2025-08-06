import { injectable, inject } from 'tsyringe';
import { Role } from '../../../domain/entities/Role';
import { IRolesRepository } from '../../../domain/repositories/IRolesRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface IRequest {
  id: string;
  nome?: string;
  descricao?: string;
  ativo?: boolean;
}

@injectable()
export class UpdateRoleUseCase {
  constructor(
    @inject('RolesRepository')
    private rolesRepository: IRolesRepository
  ) {}

  async execute({ id, nome, descricao, ativo }: IRequest): Promise<Role> {
    const role = await this.rolesRepository.findById(id);

    if (!role) {
      throw new AppError('Role não encontrada', 404);
    }

    if (nome && nome !== role.nome) {
      const existingRole = await this.rolesRepository.findByNome(nome);
      if (existingRole) {
        throw new AppError('Já existe uma role com este nome', 409);
      }
      role.nome = nome;
    }

    if (descricao !== undefined) {
      role.descricao = descricao;
    }

    if (ativo !== undefined) {
      role.ativo = ativo;
    }

    role.updatedAt = new Date();

    return await this.rolesRepository.update(role);
  }
}