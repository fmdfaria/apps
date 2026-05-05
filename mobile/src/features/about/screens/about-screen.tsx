import Constants from 'expo-constants';
import { ScrollView, View } from 'react-native';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';

export function AboutScreen() {
  const appVersion = Constants.expoConfig?.version ?? 'N/A';
  const androidVersionCode = Constants.expoConfig?.android?.versionCode;

  return (
    <AppScreen>
      <PageHeader title="Sobre" subtitle="Informações da versão do aplicativo" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        <Card className="gap-3">
          <View className="gap-1">
            <AppText className="text-sm text-content-secondary">Versão atual</AppText>
            <AppText className="text-2xl font-bold text-content-primary">{appVersion}</AppText>
          </View>

          {androidVersionCode ? (
            <View className="gap-1">
              <AppText className="text-sm text-content-secondary">Build Android</AppText>
              <AppText className="text-base font-semibold text-content-primary">{String(androidVersionCode)}</AppText>
            </View>
          ) : null}
        </Card>
      </ScrollView>
    </AppScreen>
  );
}
