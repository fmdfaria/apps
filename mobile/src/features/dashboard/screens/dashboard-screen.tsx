import { ScrollView, View } from 'react-native';
import { AnimatedSection } from '@/components/layout/animated-section';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';

export function DashboardScreen() {
  return (
    <AppScreen>
      <PageHeader title="Início" subtitle="Resumo operacional da clínica" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
        <AnimatedSection delay={20}>
          <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
            <AppText className="text-base font-semibold text-content-primary">Atalhos principais</AppText>
            <AppText className="mt-2 text-sm text-content-secondary">
              Use as abas de Agendamentos, Pacientes e Agenda para acompanhar o dia a dia da clínica.
            </AppText>
          </View>
        </AnimatedSection>

        <AnimatedSection delay={80} className="gap-3">
          <AppText className="text-lg font-semibold text-content-primary">Visão do aplicativo</AppText>
          <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
            <AppText className="text-sm text-content-secondary">
              Este aplicativo está focado na operação clínica e não possui funcionalidades de CRM.
            </AppText>
          </View>
        </AnimatedSection>

        <AnimatedSection delay={120} className="gap-2">
          <AppText className="text-lg font-semibold text-content-primary">Próxima ação</AppText>
          <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
            <AppText className="text-base font-semibold text-content-primary">Revisar agenda e atendimentos pendentes</AppText>
            <AppText className="mt-1 text-sm text-content-secondary">
              Priorize cancelamentos, reagendamentos e atendimentos do dia para manter o fluxo organizado.
            </AppText>
          </View>
        </AnimatedSection>
      </ScrollView>
    </AppScreen>
  );
}
