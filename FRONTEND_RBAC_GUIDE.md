# Guia de Implementação RBAC no Frontend

## Resumo das Modificações no Backend

O sistema de controle de acesso baseado em roles (RBAC) foi implementado no backend com:

- **Tabelas criadas**: `roles`, `routes`, `user_roles`, `role_routes`
- **API Endpoints**: CRUD completo para roles, rotas e associações
- **Middleware de autorização**: Verificação automática de permissões por rota
- **JWT Token**: Agora inclui as roles do usuário

## SQL para Criar as Tabelas

Execute no PostgreSQL (não rode migrations automáticas):

```sql
-- Tabela de Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(50) UNIQUE NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Rotas do Frontend
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    modulo VARCHAR(50),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(path, method)
);

-- Tabela de Associação Usuário-Role (1-N)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Tabela de Associação Role-Rota
CREATE TABLE role_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL,
    route_id UUID NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role_id, route_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
);

-- Adicionar coluna user_roles na tabela users
ALTER TABLE users ADD COLUMN user_roles_relation TEXT; -- Esta é apenas referência, a relação real é na tabela user_roles

-- Índices para performance
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_role_routes_role_id ON role_routes(role_id);
CREATE INDEX idx_role_routes_route_id ON role_routes(route_id);
```

## Endpoints da API Criados

### Roles
- `POST /roles` - Criar role
- `GET /roles` - Listar roles
- `PUT /roles/:id` - Atualizar role
- `DELETE /roles/:id` - Deletar role

### Rotas Frontend
- `POST /routes` - Cadastrar rota do frontend
- `GET /routes` - Listar rotas
- `PUT /routes/:id` - Atualizar rota
- `DELETE /routes/:id` - Deletar rota

### Associações Usuário-Role
- `POST /user-roles` - Associar role a usuário
- `DELETE /user-roles/:userId/:roleId` - Remover role do usuário
- `GET /users/:userId/roles` - Listar roles do usuário
- `GET /users/:userId/allowed-routes` - Listar rotas permitidas do usuário

### Associações Role-Rota
- `POST /role-routes` - Associar rota a role
- `DELETE /role-routes/:roleId/:routeId` - Remover rota da role

## Modificações Necessárias no Frontend

### 1. Atualizar Types/Interfaces

```typescript
// src/types/auth.ts
export interface User {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  roles?: string[]; // Nova propriedade
}

// src/types/rbac.ts
export interface Role {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
}

export interface Route {
  id: string;
  path: string;
  method: string;
  nome: string;
  descricao?: string;
  modulo?: string;
  ativo: boolean;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  ativo: boolean;
}
```

### 2. Criar Serviços de API

```typescript
// src/services/rbac.ts
import { api } from './api';

export const rbacService = {
  // Roles
  createRole: (data: { nome: string; descricao?: string }) => 
    api.post('/roles', data),
  
  getRoles: (onlyActive = false) => 
    api.get(`/roles?onlyActive=${onlyActive}`),
  
  updateRole: (id: string, data: Partial<Role>) => 
    api.put(`/roles/${id}`, data),
  
  deleteRole: (id: string) => 
    api.delete(`/roles/${id}`),

  // Routes
  createRoute: (data: { path: string; method: string; nome: string; descricao?: string; modulo?: string }) => 
    api.post('/routes', data),
  
  getRoutes: (onlyActive = false, modulo?: string) => 
    api.get(`/routes?onlyActive=${onlyActive}${modulo ? `&modulo=${modulo}` : ''}`),
  
  // User Roles
  assignRoleToUser: (userId: string, roleId: string) => 
    api.post('/user-roles', { userId, roleId }),
  
  getUserRoles: (userId: string, onlyActive = true) => 
    api.get(`/users/${userId}/roles?onlyActive=${onlyActive}`),
  
  getUserAllowedRoutes: (userId: string) => 
    api.get(`/users/${userId}/allowed-routes`),
  
  removeRoleFromUser: (userId: string, roleId: string) => 
    api.delete(`/user-roles/${userId}/${roleId}`),
  
  // Role Routes
  assignRouteToRole: (roleId: string, routeId: string) => 
    api.post('/role-routes', { roleId, routeId }),
  
  removeRouteFromRole: (roleId: string, routeId: string) => 
    api.delete(`/role-routes/${roleId}/${routeId}`)
};
```

### 3. Criar Hook de Autorização

```typescript
// src/hooks/usePermissions.ts
import { useAuth } from './useAuth';
import { useQuery } from '@tanstack/react-query';
import { rbacService } from '../services/rbac';

export const usePermissions = () => {
  const { user } = useAuth();
  
  const { data: allowedRoutes = [] } = useQuery({
    queryKey: ['user-allowed-routes', user?.id],
    queryFn: () => user?.id ? rbacService.getUserAllowedRoutes(user.id) : [],
    enabled: !!user?.id
  });

  const hasPermission = (path: string, method = 'GET') => {
    return allowedRoutes.some(route => 
      route.path === path && route.method.toLowerCase() === method.toLowerCase()
    );
  };

  const canAccess = (routePath: string) => {
    return allowedRoutes.some(route => route.path === routePath);
  };

  return {
    allowedRoutes,
    hasPermission,
    canAccess
  };
};
```

### 4. Componente ProtectedRoute

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPath: string;
  fallback?: string;
}

export const ProtectedRoute = ({ 
  children, 
  requiredPath, 
  fallback = '/dashboard' 
}: ProtectedRouteProps) => {
  const { canAccess } = usePermissions();

  if (!canAccess(requiredPath)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};
```

### 5. Páginas de Administração

Criar páginas para:
- **Gerenciar Roles** (`/admin/roles`)
- **Gerenciar Rotas** (`/admin/routes`) 
- **Associar Usuários x Roles** (`/admin/user-roles`)
- **Associar Roles x Rotas** (`/admin/permissions`)

### 6. Exemplos de Rotas Frontend para Cadastrar

```typescript
// Exemplo de rotas que deveriam ser cadastradas no banco
const frontendRoutes = [
  { path: '/dashboard', method: 'GET', nome: 'Dashboard', modulo: 'geral' },
  { path: '/pacientes', method: 'GET', nome: 'Lista Pacientes', modulo: 'pacientes' },
  { path: '/pacientes/novo', method: 'GET', nome: 'Cadastrar Paciente', modulo: 'pacientes' },
  { path: '/profissionais', method: 'GET', nome: 'Lista Profissionais', modulo: 'profissionais' },
  { path: '/agendamentos', method: 'GET', nome: 'Agendamentos', modulo: 'agendamentos' },
  { path: '/admin/roles', method: 'GET', nome: 'Gerenciar Roles', modulo: 'admin' },
  { path: '/admin/permissions', method: 'GET', nome: 'Permissões', modulo: 'admin' }
];
```

### 7. Exemplo de Roles Padrão

```typescript
const defaultRoles = [
  { nome: 'ADMIN', descricao: 'Administrador do sistema' },
  { nome: 'RECEPCIONISTA', descricao: 'Recepcionista da clínica' },
  { nome: 'PROFISSIONAL', descricao: 'Profissional de saúde' },
  { nome: 'PACIENTE', descricao: 'Paciente da clínica' }
];
```

## Fluxo de Implementação Recomendado

1. **Executar SQLs** no banco de dados PostgreSQL
2. **Criar roles padrão** usando a API
3. **Cadastrar rotas do frontend** usando a API
4. **Associar roles x rotas** conforme regras de negócio
5. **Implementar interfaces no frontend** para gerenciar tudo
6. **Testar o sistema** com diferentes usuários e roles

## Observações Importantes

- O campo `tipo` na tabela `users` pode ser removido gradualmente
- As roles agora substituem completamente o sistema anterior
- Cada usuário pode ter múltiplas roles (relação 1-N)
- Middleware de autorização funciona automaticamente no backend
- JWT token inclui as roles do usuário para validação no frontend