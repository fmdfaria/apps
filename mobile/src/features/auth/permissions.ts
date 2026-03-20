import type { UserPermission } from '@/features/auth/types';

type RouteRule = {
  path: string;
  method: string;
};

export type FeatureKey =
  | 'dashboard'
  | 'agenda'
  | 'atendimentos'
  | 'atendimento'
  | 'pacientes'
  | 'tarefas'
  | 'financeiro'
  | 'notificacoes'
  | 'configuracoes';

const featureRules: Record<FeatureKey, RouteRule[]> = {
  dashboard: [{ path: '/dashboard', method: 'GET' }],
  agenda: [{ path: '/agendamentos-calendario-profissional', method: 'GET' }],
  atendimentos: [{ path: '/agendamentos', method: 'GET' }],
  atendimento: [{ path: '/agendamentos-atender-page', method: 'GET' }],
  pacientes: [{ path: '/pacientes', method: 'GET' }],
  tarefas: [{ path: '/agendamentos-pendencias', method: 'GET' }],
  financeiro: [{ path: '/contas-receber', method: 'GET' }],
  notificacoes: [{ path: '/pacientes/pedidos', method: 'GET' }],
  configuracoes: [{ path: '/configuracoes', method: 'GET' }],
};

export function hasRoutePermission(permissions: UserPermission[], rule: RouteRule) {
  return permissions.some((permission) => {
    return permission.path === rule.path && permission.method.toUpperCase() === rule.method.toUpperCase();
  });
}

export function canAccessFeature(permissions: UserPermission[], feature: FeatureKey) {
  const rules = featureRules[feature];

  if (!rules.length) {
    return false;
  }

  return rules.some((rule) => hasRoutePermission(permissions, rule));
}
