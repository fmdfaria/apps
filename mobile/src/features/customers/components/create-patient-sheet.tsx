import { useEffect, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { Convenio } from '@/features/customers/types';
import { applyDateMask } from '@/utils/date';
import { applyWhatsAppMask } from '@/utils/whatsapp';

type FormValues = {
  nomeCompleto: string;
  nomeResponsavel: string;
  whatsapp: string;
  cpf: string;
  email: string;
  dataNascimento: string;
  tipoServico: '' | 'Particular' | 'Convênio';
  convenioId: string;
  numeroCarteirinha: string;
};

type Props = {
  visible: boolean;
  loading: boolean;
  loadingConvenios: boolean;
  convenios: Convenio[];
  values: FormValues;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (updates: Partial<FormValues>) => void;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function CreatePatientSheet({
  visible,
  loading,
  loadingConvenios,
  convenios,
  values,
  error,
  onClose,
  onSubmit,
  onChange,
}: Props) {
  const convenioParticular = useMemo(
    () => convenios.find((convenio) => convenio.nome.trim().toLowerCase() === 'particular'),
    [convenios],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (values.tipoServico === 'Particular' && convenioParticular && values.convenioId !== convenioParticular.id) {
      onChange({ convenioId: convenioParticular.id });
      return;
    }

    if (values.tipoServico === 'Convênio' && values.convenioId && convenioParticular && values.convenioId === convenioParticular.id) {
      onChange({ convenioId: '' });
      return;
    }

    if (!values.tipoServico && values.convenioId) {
      onChange({ convenioId: '' });
    }
  }, [convenioParticular, onChange, values.convenioId, values.tipoServico, visible]);

  const convenioOptions = useMemo(() => {
    if (values.tipoServico === 'Particular') {
      return convenioParticular ? [{ label: convenioParticular.nome, value: convenioParticular.id }] : [];
    }

    if (values.tipoServico === 'Convênio') {
      return convenios
        .filter((convenio) => convenio.nome.trim().toLowerCase() !== 'particular')
        .map((convenio) => ({ label: convenio.nome, value: convenio.id }));
    }

    return [];
  }, [convenioParticular, convenios, values.tipoServico]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Novo paciente">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
        <Input
          label="Nome completo do paciente *"
          value={values.nomeCompleto}
          onChangeText={(text) => onChange({ nomeCompleto: text })}
          placeholder="Nome completo"
          autoCapitalize="words"
        />

        <Input
          label="Nome do responsável"
          value={values.nomeResponsavel}
          onChangeText={(text) => onChange({ nomeResponsavel: text })}
          placeholder="Opcional"
          autoCapitalize="words"
        />

        <Input
          label="WhatsApp *"
          value={values.whatsapp}
          onChangeText={(text) => onChange({ whatsapp: applyWhatsAppMask(text) })}
          placeholder="+55 (11) 99999-9999"
          keyboardType="phone-pad"
        />

        <Input
          label="CPF"
          value={values.cpf}
          onChangeText={(text) => onChange({ cpf: formatCpf(text) })}
          placeholder="000.000.000-00"
          keyboardType="number-pad"
        />

        <Select
          label="Tipo de serviço *"
          placeholder="Selecione"
          value={values.tipoServico}
          onChange={(tipoServico) => onChange({ tipoServico: tipoServico as FormValues['tipoServico'] })}
          options={[
            { label: 'Particular', value: 'Particular' },
            { label: 'Convênio', value: 'Convênio' },
          ]}
        />

        <Select
          label={values.tipoServico === 'Convênio' ? 'Convênio *' : 'Convênio'}
          placeholder={
            !values.tipoServico
              ? 'Selecione o tipo de serviço'
              : values.tipoServico === 'Particular'
                ? 'Particular selecionado automaticamente'
                : loadingConvenios
                  ? 'Carregando convênios...'
                  : 'Selecione'
          }
          value={values.convenioId}
          onChange={(convenioId) => onChange({ convenioId })}
          options={convenioOptions}
        />

        <Input
          label="Nº carteirinha"
          value={values.numeroCarteirinha}
          onChangeText={(text) => onChange({ numeroCarteirinha: text })}
          placeholder="Opcional"
        />

        <Input
          label="Data de nascimento"
          value={values.dataNascimento}
          onChangeText={(text) => onChange({ dataNascimento: applyDateMask(text) })}
          placeholder="DD-MM-AAAA"
          keyboardType="number-pad"
        />

        <Input
          label="E-mail"
          value={values.email}
          onChangeText={(text) => onChange({ email: text })}
          placeholder="nome@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {error ? <AppText className="text-sm font-semibold text-content-danger">{error}</AppText> : null}

        <View className="mt-2 flex-row gap-2">
          <Button label="Cancelar" variant="secondary" className="flex-1" onPress={onClose} disabled={loading} />
          <Button label="Salvar" className="flex-1" onPress={onSubmit} loading={loading} />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
