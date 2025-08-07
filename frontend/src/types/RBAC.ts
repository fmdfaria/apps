export interface Role {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Route {
  id: string;
  path: string;
  method: string;
  nome: string;
  descricao?: string;
  modulo?: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleRoute {
  id: string;
  roleId: string;
  routeId: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para requests das APIs
export interface CreateRoleRequest {
  nome: string;
  descricao?: string;
}

export interface UpdateRoleRequest {
  nome?: string;
  descricao?: string;
  ativo?: boolean;
}

export interface CreateRouteRequest {
  path: string;
  method: string;
  nome: string;
  descricao?: string;
  modulo?: string;
}

export interface UpdateRouteRequest {
  path?: string;
  method?: string;
  nome?: string;
  descricao?: string;
  modulo?: string;
  ativo?: boolean;
}

export interface AssignRoleToUserRequest {
  userId: string;
  roleId: string;
}

export interface AssignRouteToRoleRequest {
  roleId: string;
  routeId: string;
}

export interface CreateUserRoleRequest {
  userId: string;
  roleId: string;
}

export interface UpdateUserRoleRequest {
  ativo: boolean;
}

export interface CreateRoleRouteRequest {
  roleId: string;
  routeId: string;
}

export interface UpdateRoleRouteRequest {
  ativo: boolean;
}

// Tipos para responses das APIs
export interface UserAllowedRoute {
  id: string;
  path: string;
  method: string;
  nome: string;
  modulo?: string;
}

// Tipos para componentes
export interface RoleWithUsers {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  userCount: number;
}

export interface UserWithRoles {
  id: string;
  nome: string;
  email: string;
  roles: Role[];
}

export interface RouteWithRoles {
  id: string;
  path: string;
  method: string;
  nome: string;
  modulo?: string;
  roles: Role[];
}