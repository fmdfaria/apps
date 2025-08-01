import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormErrorMessage } from '@/components/form-error-message';
import type { Paciente } from '@/types/Paciente';
import { useInputMask } from '@/hooks/useInputMask';

interface FormPaciente {
  nomeCompleto: string;
  cpf: string;
  email: string;
  whatsapp: string;
  dataNascimento: string;
  tipoServico: string;
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
  const maskTelefone = useInputMask('+99 (99) 99999-9999');
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
            {/* Primeira linha: Nome Completo + Tipo de Serviço */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">👤</span>
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nomeCompleto}
                  onChange={e => onFormChange({ nomeCompleto: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  minLength={2}
                  disabled={formLoading}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">🏥</span>
                  Tipo de Serviço <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.tipoServico}
                  onChange={e => onFormChange({ tipoServico: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  disabled={formLoading}
                >
                  <option value="">Selecione o tipo de serviço</option>
                  <option value="Particular">Particular</option>
                  <option value="Convênio">Convênio</option>
                </select>
              </div>
            </div>

            {/* Campos básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">🆔</span>
                  CPF <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={e => onFormChange({ cpf: maskCPF(e.target.value) })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  minLength={14}
                  disabled={formLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">📧</span>
                  E-mail <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => onFormChange({ email: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  disabled={formLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">📱</span>
                  WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.whatsapp}
                  onChange={e => onFormChange({ whatsapp: maskTelefone(e.target.value) })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  disabled={formLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">🎂</span>
                  Data de Nascimento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.dataNascimento}
                  onChange={e => onFormChange({ dataNascimento: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
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