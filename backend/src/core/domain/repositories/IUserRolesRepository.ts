import { UserRole } from '../entities/UserRole';

export interface IUserRolesRepository {
  create(userRole: UserRole): Promise<UserRole>;
  findById(id: string): Promise<UserRole | null>;
  findByUserId(userId: string): Promise<UserRole[]>;
  findByRoleId(roleId: string): Promise<UserRole[]>;
  findByUserAndRole(userId: string, roleId: string): Promise<UserRole | null>;
  findAll(): Promise<UserRole[]>;
  update(userRole: UserRole): Promise<UserRole>;
  delete(id: string): Promise<void>;
  deleteByUserAndRole(userId: string, roleId: string): Promise<void>;
  findActiveUserRoles(userId: string): Promise<UserRole[]>;
  findActiveUserRolesWithNames(userId: string): Promise<{ roleId: string; roleName: string }[]>;
}