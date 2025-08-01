import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormErrorMessage } from '@/components/form-error-message';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import type { Paciente } from '@/types/Paciente';
import type { Convenio } from '@/types/Convenio';

interface FormConvenio {
  convenioId: string;
  numeroCarteirinha: string;
  dataPedidoMedico: string;
  crm: string;
  cbo: string;
  cid: string;
}

interface ConvenioModalProps {
  showModal: boolean;
  paciente: Paciente | null;
  form: FormConvenio;
  formError: string;
  formLoading: boolean;
  convenios: Convenio[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormChange: (updates: Partial<FormConvenio>) => void;
}

export default function ConvenioModal({
  showModal,
  paciente,
  form,
  formError,
  formLoading,
  convenios,
  onClose,
  onSubmit,
  onFormChange
}: ConvenioModalProps) {
  return (
    <Dialog open={showModal} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <form onSubmit={onSubmit}>
          <DialogHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-2xl">🏥</span>
              Dados do Convênio - {paciente?.nomeCompleto}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 flex flex-col gap-6">
            {/* Linha 1: Convênio + Nº Carteirinha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">🏥</span>
                  Convênio <span className="text-red-500">*</span>
                </label>
                <SingleSelectDropdown
                  options={convenios.map(c => ({
                    id: c.id,
                    nome: c.nome,
                    sigla: undefined
                  }))}
                  selected={convenios.find(c => c.id === form.convenioId) ? {
                    id: form.convenioId,
                    nome: convenios.find(c => c.id === form.convenioId)?.nome || '',
                    sigla: undefined
                  } : null}
                  onChange={(selected) => {
                    onFormChange({ convenioId: selected?.id || '' });
                  }}
                  placeholder="Buscar convênio..."
                  headerText="Convênios disponíveis"
                  formatOption={(option) => option.nome}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">🎫</span>
                  Nº Carteirinha <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.numeroCarteirinha}
                  onChange={e => onFormChange({ numeroCarteirinha: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  disabled={formLoading}
                />
              </div>
            </div>
            
            {/* Linha 2: Data Pedido Médico + CRM */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  Data Pedido Médico <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.dataPedidoMedico}
                  onChange={e => onFormChange({ dataPedidoMedico: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  disabled={formLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">👨‍⚕️</span>
                  CRM <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.crm}
                  onChange={e => onFormChange({ crm: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  disabled={formLoading}
                />
              </div>
            </div>
            
            {/* Linha 3: CBO + CID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">🩺</span>
                  CBO <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.cbo}
                  onChange={e => onFormChange({ cbo: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  disabled={formLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  CID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.cid}
                  onChange={e => onFormChange({ cid: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                  disabled={formLoading}
                />
              </div>
            </div>
          </div>
          
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
        </form>
      </DialogContent>
    </Dialog>
  );
}