import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { api } from '@/services/api/client';

type BrandedLoadingStateProps = {
  subtitle?: string;
};

export function BrandedLoadingState({ subtitle = 'Preparando os dados...' }: BrandedLoadingStateProps) {
  const [logoUrl, setLogoUrl] = useState('');
  const [logoLoading, setLogoLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchLogo() {
      try {
        setLogoLoading(true);
        const response = await api.get<{ logoUrl?: string }>('/logo', { skipAuthRefresh: true });
        if (active) {
          setLogoUrl(response.data.logoUrl || '');
        }
      } catch {
        if (active) {
          setLogoUrl('');
        }
      } finally {
        if (active) {
          setLogoLoading(false);
        }
      }
    }

    void fetchLogo();

    return () => {
      active = false;
    };
  }, []);

  return (
    <AppScreen contentClassName="items-center justify-center px-6 pb-12">
      <View className="w-full max-w-[360px] items-center">
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={{ width: 240, height: 90 }}
            resizeMode="contain"
            accessibilityLabel="Logo do aplicativo"
            onError={() => setLogoUrl('')}
          />
        ) : logoLoading ? (
          <View className="h-[90px] w-60 rounded-xl bg-slate-200/60" />
        ) : (
          <AppText className="text-xl font-extrabold text-slate-700">Probotec Clínica</AppText>
        )}

        <View className="mt-6 flex-row items-center gap-3">
          <ActivityIndicator size="small" color="#0284c7" />
          <AppText className="text-sm font-extrabold text-slate-800">Carregando</AppText>
        </View>

        <AppText className="mt-3 text-center text-xs font-semibold text-content-muted">{subtitle}</AppText>
      </View>
    </AppScreen>
  );
}
