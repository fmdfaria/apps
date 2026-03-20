import { ScrollView, View } from 'react-native';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { useFooterMenus } from '@/features/navigation/context/footer-menu-context';
import { useToast } from '@/providers/toast-provider';

export function SettingsScreen() {
  const { availableMenus, selectedCount, isSelected, toggleMenu, resetToDefault } = useFooterMenus();
  const { showToast } = useToast();

  return (
    <AppScreen>
      <PageHeader title="" subtitle="Personalize os menus do rodapé do aplicativo" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
          <AppText className="text-base font-semibold text-content-primary">Menu inferior</AppText>
          <AppText className="mt-2 text-sm text-content-secondary">
            Início fica fixo à esquerda e Mais fica fixo à direita. No centro, você pode escolher até 4 menus.
          </AppText>

          <View className="mt-3 flex-row items-center justify-between">
            <AppText className="text-sm font-semibold text-content-primary">Selecionados</AppText>
            <Chip label={`${selectedCount}/4`} tone={selectedCount === 4 ? 'success' : 'info'} />
          </View>

          <View className="mt-3 gap-2">
            {availableMenus.map((menu) => {
              const selected = isSelected(menu.id);

              return (
                <View key={menu.id} className="rounded-xl border border-surface-border bg-surface-background px-3 py-3">
                  <View className="flex-row items-center justify-between gap-3">
                    <AppText className="flex-1 text-sm font-semibold text-content-primary">{menu.label}</AppText>
                    <Button
                      size="sm"
                      variant={selected ? 'primary' : 'secondary'}
                      label={selected ? 'No rodapé' : 'No menu Mais'}
                      onPress={() => {
                        const changed = toggleMenu(menu.id);
                        if (!changed) {
                          showToast({ message: 'Você pode selecionar até 4 menus no rodapé.' });
                        }
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          <View className="mt-3">
            <Button label="Restaurar padrão" variant="secondary" onPress={resetToDefault} />
          </View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}
