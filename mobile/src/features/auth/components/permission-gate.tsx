import { type ReactNode } from 'react';
import { AppScreen } from '@/components/ui/app-screen';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/features/auth/context/auth-context';
import type { FeatureKey } from '@/features/auth/permissions';

type PermissionGateProps = {
  feature: FeatureKey;
  children: ReactNode;
  title: string;
  subtitle: string;
};

export function PermissionGate({ feature, children, title, subtitle }: PermissionGateProps) {
  const { canAccessFeature } = useAuth();

  if (!canAccessFeature(feature)) {
    return (
      <AppScreen>
        <PageHeader title={title} subtitle={subtitle} />
        <ErrorState
          title="Acesso não permitido"
          description="Seu perfil não possui permissão para acessar este módulo."
        />
      </AppScreen>
    );
  }

  return <>{children}</>;
}
