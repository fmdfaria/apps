import { Role } from '../entities/Role';

export interface IRolesRepository {
  create(role: Role): Promise<Role>;
  findById(id: string): Promise<Role | null>;
  findByNome(nome: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  update(role: Role): Promise<Role>;
  delete(id: string): Promise<void>;
  findActiveRoles(): Promise<Role[]>;
}