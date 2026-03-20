import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/button';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Select } from '@/components/ui/select';
import { tokens } from '@/theme';

const sourceOptions = [
  { label: 'Indicacao', value: 'indicacao' },
  { label: 'Site', value: 'site' },
  { label: 'Campanha', value: 'campanha' },
];

export default function QuickActionsModal() {
  const router = useRouter();
  const [source, setSource] = useState<string | undefined>();

  return (
    <AppScreen>
      <View className="rounded-2xl border border-surface-border bg-surface-card p-5">
        <View className="mb-4 flex-row items-center gap-2">
          <Ionicons name="flash-outline" size={20} color={tokens.colors.primary} />
          <AppText className="text-lg font-semibold text-content-primary">Acoes rapidas</AppText>
        </View>

        <View className="gap-4">
          <Select label="Origem do lead" placeholder="Selecione a origem" options={sourceOptions} value={source} onChange={setSource} />

          <Button label="Novo lead" onPress={() => router.back()} />
          <Button label="Novo cliente" variant="secondary" onPress={() => router.back()} />
          <Button label="Agendar tarefa" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    </AppScreen>
  );
}
