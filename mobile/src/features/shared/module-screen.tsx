import { ScrollView, View } from 'react-native';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';

type ModuleScreenProps = {
  title: string;
  subtitle: string;
};

export function ModuleScreen({ title, subtitle }: ModuleScreenProps) {
  return (
    <AppScreen>
      <PageHeader title={title} subtitle={subtitle} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
          <AppText className="text-base font-semibold text-content-primary">Padrao de pagina secundaria</AppText>
          <AppText className="mt-2 text-sm text-content-secondary">
            Use esse bloco como base para listas, filtros por sheet e detalhes em stack.
          </AppText>
        </View>

        <EmptyState
          title="Modulo pronto para evoluir"
          description="Conecte dados reais e mantenha os mesmos componentes para consistencia visual e comportamental."
        />
      </ScrollView>
    </AppScreen>
  );
}
