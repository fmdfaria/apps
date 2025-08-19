import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormErrorMessage } from '@/components/form-error-message';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import type { Paciente } from '@/types/Paciente';
import type { Convenio } from '@/types/Convenio';
import { useInputMask } from '@/hooks/useInputMask';
import { getConvenios } from '@/services/convenios';

interface FormPaciente {
  nomeCompleto: string;
  nomeResponsavel: string;
  cpf: string;
  email: string;
  whatsapp: string;
  dataNascimento: string;
  tipoServico: string;
  convenioId: string;
}

interface PacienteModalProps {
  showModal: boolean;
  editando: Paciente | null;
  form: FormPaciente;
  formError: string;
  formLoading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormChange: (updates: Partial<FormPaciente>) => void;
}

export default function PacienteModal({
  showModal,
  editando,
  form,
  formError,
  formLoading,
  onClose,
  onSubmit,
  onFormChange
}: PacienteModalProps) {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [carregandoConvenios, setCarregandoConvenios] = useState(false);

  useEffect(() => {
    if (showModal) {
      carregarConvenios();
    }
  }, [showModal]);

  const carregarConvenios = async () => {
    try {
      setCarregandoConvenios(true);
      const dados = await getConvenios();
      setConvenios(dados);
    } catch (error) {
      console.error('Erro ao carregar convênios:', error);
    } finally {
      setCarregandoConvenios(false);
    }
  };

  // Buscar o convênio "Particular" pelo nome
  const getConvenioParticular = () => {
    return convenios.find(c => c.nome.toLowerCase() === 'particular');
  };

  // Lógica para gerenciar o campo convênio baseado no tipo de serviço
  useEffect(() => {
    if (form.tipoServico === 'Particular') {
      // Auto-selecionar "Particular" quando tipo = Particular
      const convenioParticular = getConvenioParticular();
      if (convenioParticular) {
        onFormChange({ convenioId: convenioParticular.id });
      }
    } else if (form.tipoServico === 'Convênio') {
      // Limpar seleção se estava em "Particular" e mudou para "Convênio"
      const convenioParticular = getConvenioParticular();
      if (convenioParticular && form.convenioId === convenioParticular.id) {
        onFormChange({ convenioId: '' });
      }
    } else if (!form.tipoServico) {
      // Se limpar o tipo de serviço, resetar o convênio
      onFormChange({ convenioId: '' });
    }
  }, [form.tipoServico, convenios, onFormChange]);

  // Função para filtrar opções de convênio
  const getConvenioOptions = () => {
    if (form.tipoServico === 'Particular') {
      const convenioParticular = getConvenioParticular();
      return convenioParticular ? [convenioParticular] : [];
    } else if (form.tipoServico === 'Convênio') {
      // Retorna todos os convênios exceto o "Particular"
      return convenios.filter(c => c.nome.toLowerCase() !== 'particular');
    }
    return [];
  };

  // Verificar se o campo convênio deve estar habilitado
  const isConvenioEnabled = form.tipoServico === 'Convênio';

  // Máscara customizada para WhatsApp que suporta 8 e 9 dígitos
  const maskTelefone = (value: string) => {
    if (!value) return '';
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 13 dígitos (55 + DD + 9 dígitos)
    const limitedNumbers = numbers.slice(0, 13);
    
    if (limitedNumbers.length <= 2) {
      return `+${limitedNumbers}`;
    } else if (limitedNumbers.length <= 4) {
      return `+${limitedNumbers.slice(0, 2)} (${limitedNumbers.slice(2)}`;
    } else if (limitedNumbers.length <= 8) {
      return `+${limitedNumbers.slice(0, 2)} (${limitedNumbers.slice(2, 4)}) ${limitedNumbers.slice(4)}`;
    } else if (limitedNumbers.length <= 12) {
      // Para números de 8 dígitos
      return `+${limitedNumbers.slice(0, 2)} (${limitedNumbers.slice(2, 4)}) ${limitedNumbers.slice(4, 8)}-${limitedNumbers.slice(8)}`;
    } else {
      // Para números de 9 dígitos
      return `+${limitedNumbers.slice(0, 2)} (${limitedNumbers.slice(2, 4)}) ${limitedNumbers.slice(4, 9)}-${limitedNumbers.slice(9)}`;
    }
  };
  const maskCPF = useInputMask('999.999.999-99');

  return (
    <Dialog open={showModal} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <form onSubmit={onSubmit}>
          <DialogHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-2xl">👥</span>
              {editando ? 'Editar Paciente' : 'Novo Paciente'}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-6">
            {/* Linha 1: Nome Completo | Nome do Responsável */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">👤</span>
                  Nome Completo do Paciente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nomeCompleto}
                  onChange={e => onFormChange({ nomeCompleto: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  minLength={2}
                  disabled={formLoading}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">👨‍👩‍👧</span>
                  Nome do Responsável
                </label>
                <input
                  type="text"
                  value={form.nomeResponsavel}
                  onChange={e => onFormChange({ nomeResponsavel: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  placeholder="Nome do responsável (opcional)"
                  disabled={formLoading}
                />
              </div>
            </div>

            {/* Linha 2: WhatsApp | CPF */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">📱</span>
                  WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.whatsapp}
                  onChange={e => onFormChange({ whatsapp: maskTelefone(e.target.value) })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  placeholder="+55 (11) 99999-9999"
                  disabled={formLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">🆔</span>
                  CPF
                </label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={e => onFormChange({ cpf: maskCPF(e.target.value) })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  placeholder="000.000.000-00"
                  disabled={formLoading}
                />
              </div>
            </div>

            {/* Linha 3: Tipo de Serviço | Convênio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">🏥</span>
                  Tipo de Serviço <span className="text-red-500">*</span>
                </label>
                <div className="w-full">
                  <SingleSelectDropdown
                    options={[
                      { id: 'Particular', nome: 'Particular' },
                      { id: 'Convênio', nome: 'Convênio' }
                    ]}
                    selected={form.tipoServico ? {
                      id: form.tipoServico,
                      nome: form.tipoServico
                    } : null}
                    onChange={(selected) => {
                      onFormChange({ tipoServico: selected?.id || '' });
                    }}
                    placeholder="Selecione..."
                    headerText="Tipos de serviço"
                    formatOption={(option) => option.nome}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">🏥</span>
                  Convênio
                  {form.tipoServico && <span className="text-red-500">*</span>}
                </label>
                <div className="w-full">
                  <SingleSelectDropdown
                    options={getConvenioOptions().map(convenio => ({ id: convenio.id, nome: convenio.nome }))}
                    selected={form.convenioId ? {
                      id: form.convenioId,
                      nome: convenios.find(c => c.id === form.convenioId)?.nome || ''
                    } : null}
                    onChange={(selected) => {
                      onFormChange({ convenioId: selected?.id || '' });
                    }}
                    placeholder={
                      !form.tipoServico 
                        ? "Selecione tipo de serviço..."
                        : carregandoConvenios 
                          ? "Carregando..." 
                          : form.tipoServico === 'Particular'
                            ? "Particular selecionado automaticamente"
                            : "Selecione um convênio..."
                    }
                    headerText="Convênios"
                    formatOption={(option) => option.nome}
                    disabled={
                      !form.tipoServico || 
                      carregandoConvenios || 
                      formLoading || 
                      form.tipoServico === 'Particular'
                    }
                  />
                </div>
              </div>
            </div>

            {/* Linha 4: Data de Nascimento | E-mail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">🎂</span>
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={form.dataNascimento}
                  onChange={e => onFormChange({ dataNascimento: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  disabled={formLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">📧</span>
                  E-mail
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => onFormChange({ email: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  placeholder="nome@email.com"
                  disabled={formLoading}
                />
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={formLoading}
                  className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6 transition-all duration-200"
                >
                  <span className="mr-2">🔴</span>
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={formLoading}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200 "
              >
                {formLoading ? (
                  <>
                    <span className="mr-2">⏳</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🟢</span>
                    Salvar
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}