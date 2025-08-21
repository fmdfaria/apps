import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormErrorMessage } from '@/components/form-error-message';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { AppToast } from '@/services/toast';
import type { Paciente } from '@/types/Paciente';
import type { Convenio } from '@/types/Convenio';
import { useInputMask } from '@/hooks/useInputMask';
import { WhatsAppInput } from '@/components/ui/whatsapp-input';
import { isValidWhatsApp } from '@/utils/whatsapp';

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

interface EditarPacienteModalProps {
  showModal: boolean;
  editando: Paciente | null;
  form: FormPaciente;
  formError: string;
  formLoading: boolean;
  convenios: Convenio[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormChange: (updates: Partial<FormPaciente>) => void;
  onSuccess?: () => void;
}

export default function EditarPacienteModal({
  showModal,
  editando,
  form,
  formError,
  formLoading,
  convenios,
  onClose,
  onSubmit,
  onFormChange,
  onSuccess
}: EditarPacienteModalProps) {
  // WhatsApp é tratado via componente WhatsAppInput; form.whatsapp guarda somente dígitos (E.164 sem +)
  const maskCPF = useInputMask('999.999.999-99');

  // Função para lidar com o envio do formulário
  const handleSubmit = (e: React.FormEvent) => {
    onSubmit(e);
  };

  // Exibir toast de erro quando formError mudar
  useEffect(() => {
    if (formError) {
      AppToast.validation('Erro na validação', formError);
    }
  }, [formError]);

  return (
    <Dialog open={showModal} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-2xl">✏️</span>
              Editar Paciente
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
                <WhatsAppInput
                  value={form.whatsapp}
                  onChange={(val) => onFormChange({ whatsapp: val })}
                  className="w-full"
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
                </label>
                <div className="w-full">
                  <SingleSelectDropdown
                    options={convenios.map(convenio => ({ id: convenio.id, nome: convenio.nome }))}
                    selected={form.convenioId ? {
                      id: form.convenioId,
                      nome: editando?.convenio?.nome || 
                            convenios.find(c => c.id === form.convenioId)?.nome || ''
                    } : null}
                    onChange={(selected) => {
                      onFormChange({ convenioId: selected?.id || '' });
                    }}
                    placeholder="Selecione um convênio..."
                    headerText="Convênios"
                    formatOption={(option) => option.nome}
                    disabled={formLoading}
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
                    Atualizar
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