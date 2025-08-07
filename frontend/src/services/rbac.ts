import api from './api';
import {
  Role,
  Route,
  UserRole,
  RoleRoute,
  CreateRoleRequest,
  UpdateRoleRequest,
  CreateRouteRequest,
  UpdateRouteRequest,
  AssignRoleToUserRequest,
  AssignRouteToRoleRequest,
  UserAllowedRoute
} from '../types/RBAC';

export const rbacService = {
  // ============ ROLES ============
  createRole: async (data: CreateRoleRequest): Promise<Role> => {
    const response = await api.post('/roles', data);
    return response.data;
  },

  getRoles: async (onlyActive = false): Promise<Role[]> => {
    const response = await api.get(`/roles?onlyActive=${onlyActive}`);
    return response.data;
  },

  updateRole: async (id: string, data: UpdateRoleRequest): Promise<Role> => {
    const response = await api.put(`/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id: string): Promise<void> => {
    await api.delete(`/roles/${id}`);
  },

  // ============ ROUTES ============
  createRoute: async (data: CreateRouteRequest): Promise<Route> => {
    const response = await api.post('/routes', data);
    return response.data;
  },

  getRoutes: async (onlyActive = false, modulo?: string): Promise<Route[]> => {
    let url = `/routes?onlyActive=${onlyActive}`;
    if (modulo) {
      url += `&modulo=${modulo}`;
    }
    const response = await api.get(url);
    return response.data;
  },

  updateRoute: async (id: string, data: UpdateRouteRequest): Promise<Route> => {
    const response = await api.put(`/routes/${id}`, data);
    return response.data;
  },

  deleteRoute: async (id: string): Promise<void> => {
    await api.delete(`/routes/${id}`);
  },

  // ============ USER ROLES ============
  assignRoleToUser: async (data: AssignRoleToUserRequest): Promise<UserRole> => {
    const response = await api.post('/user-roles', data);
    return response.data;
  },

  getUserRoles: async (userId: string, onlyActive = true): Promise<UserRole[]> => {
    const response = await api.get(`/users/${userId}/roles?onlyActive=${onlyActive}`);
    return response.data;
  },

  getUserAllowedRoutes: async (userId: string): Promise<UserAllowedRoute[]> => {
    const response = await api.get(`/users/${userId}/allowed-routes`);
    return response.data;
  },

  removeRoleFromUser: async (userId: string, roleId: string): Promise<void> => {
    await api.delete(`/user-roles/${userId}/${roleId}`);
  },

  // ============ ROLE ROUTES ============
  assignRouteToRole: async (data: AssignRouteToRoleRequest): Promise<RoleRoute> => {
    const response = await api.post('/role-routes', data);
    return response.data;
  },

  removeRouteFromRole: async (roleId: string, routeId: string): Promise<void> => {
    await api.delete(`/role-routes/${roleId}/${routeId}`);
  },

  // ============ UTILS ============
  // Buscar todas as associações usuário-role para uma página de gerenciamento
  getAllUserRoles: async (): Promise<UserRole[]> => {
    const response = await api.get('/user-roles');
    return response.data;
  },

  // Buscar todas as associações role-route para uma página de gerenciamento
  getAllRoleRoutes: async (): Promise<RoleRoute[]> => {
    const response = await api.get('/role-routes');
    return response.data;
  },

  // Buscar rotas de um role específico
  getRoleRoutes: async (roleId: string): Promise<RoleRoute[]> => {
    const response = await api.get(`/roles/${roleId}/routes`);
    return response.data;
  }
};