import { RoleRoute } from '../entities/RoleRoute';

export interface IRoleRoutesRepository {
  create(roleRoute: RoleRoute): Promise<RoleRoute>;
  findById(id: string): Promise<RoleRoute | null>;
  findByRoleId(roleId: string): Promise<RoleRoute[]>;
  findByRouteId(routeId: string): Promise<RoleRoute[]>;
  findByRoleAndRoute(roleId: string, routeId: string): Promise<RoleRoute | null>;
  findAll(): Promise<RoleRoute[]>;
  update(roleRoute: RoleRoute): Promise<RoleRoute>;
  delete(id: string): Promise<void>;
  deleteByRoleAndRoute(roleId: string, routeId: string): Promise<void>;
  findActiveRoleRoutes(roleId: string): Promise<RoleRoute[]>;
  findRoutesByUserId(userId: string): Promise<{ id: string; path: string; method: string; nome: string; modulo?: string }[]>;
}