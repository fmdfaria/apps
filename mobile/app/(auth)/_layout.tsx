import { Redirect, Stack } from 'expo-router';
import { FullScreenLoader } from '@/components/feedback/full-screen-loader';
import { useAuth } from '@/features/auth/context/auth-context';
import { routes } from '@/navigation/routes';

export default function AuthLayout() {
  const { isInitializing, isAuthenticated } = useAuth();

  if (isInitializing) {
    return <FullScreenLoader />;
  }

  if (isAuthenticated) {
    return <Redirect href={routes.tabsRoot} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
