import { Redirect } from 'expo-router';
import { FullScreenLoader } from '@/components/feedback/full-screen-loader';
import { useAuth } from '@/features/auth/context/auth-context';
import { routes } from '@/navigation/routes';

export default function Index() {
  const { isInitializing, isAuthenticated } = useAuth();

  if (isInitializing) {
    return <FullScreenLoader />;
  }

  return <Redirect href={isAuthenticated ? routes.tabsRoot : routes.authLogin} />;
}
