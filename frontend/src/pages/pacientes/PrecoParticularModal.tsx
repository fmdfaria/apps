import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormErrorMessage } from '@/components/form-error-message';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import type { PrecoParticular } from '@/types/PrecoParticular';
import type { Paciente } from '@/types/Paciente';
import type { Servico } from '@/types/Servico';

interface PrecoParticularModalProps {
  showModal: boolean;
  editando: PrecoParticular | null;
  form: {
    pacienteId: string;
    servicoId: string;
    preco: string;
    duracaoMinutos: string;
    percentualClinica: string;
    percentualProfissional: string;
    precoPaciente: string;
  };
  formError: string;
  formLoading: boolean;
  pacientes: Paciente[];
  servicos: Servico[];
  convenioParticularId: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormChange: (updates: Partial<PrecoParticularModalProps['form']>) => void;
}

export default function PrecoParticularModal({
  showModal,
  editando,
  form,
  formError,
  formLoading,
  pacientes,
  servicos,
  convenioParticularId,
  onClose,
  onSubmit,
  onFormChange
}: PrecoParticularModalProps) {
  return (
    <Dialog open={showModal} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <form onSubmit={onSubmit}>
          <DialogHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-2xl">💰</span>
              {editando ? 'Editar Preço Particular' : 'Novo Preço Particular'}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            {/* Linha 1 - Paciente e Serviço */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">👤</span>
                  Paciente <span className="text-red-500">*</span>
                </label>
                <SingleSelectDropdown
                  options={pacientes.map(p => ({
                    id: p.id,
                    nome: p.nomeCompleto,
                    sigla: p.whatsapp
                  }))}
                  selected={pacientes.find(p => p.id === form.pacienteId) ? {
                    id: form.pacienteId,
                    nome: pacientes.find(p => p.id === form.pacienteId)?.nomeCompleto || '',
                    sigla: pacientes.find(p => p.id === form.pacienteId)?.whatsapp
                  } : null}
                  onChange={(selected) => {
                    onFormChange({ pacienteId: selected?.id || '' });
                  }}
                  placeholder="Buscar paciente..."
                  headerText="Pacientes disponíveis"
                  formatOption={(option) => {
                    const whatsapp = option.sigla;
                    if (whatsapp) {
                      const tel = whatsapp.replace(/\D/g, '');
                      let formatted = '';
                      if (tel.length > 11) {
                        formatted = `(${tel.slice(-11, -9)}) ${tel.slice(-9, -4)}-${tel.slice(-4)}`;
                      } else if (tel.length === 11) {
                        formatted = `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7)}`;
                      } else if (tel.length === 10) {
                        formatted = `(${tel.slice(0, 2)}) ${tel.slice(2, 6)}-${tel.slice(6)}`;
                      } else {
                        formatted = whatsapp;
                      }
                      return `${option.nome} - ${formatted}`;
                    }
                    return option.nome;
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">🩺</span>
                  Serviço <span className="text-red-500">*</span>
                </label>
                <SingleSelectDropdown
                  options={servicos
                    .filter(s => convenioParticularId ? s.convenioId === convenioParticularId : true)
                    .map(s => ({
                      id: s.id,
                      nome: s.nome,
                      sigla: s.duracaoMinutos ? `${s.duracaoMinutos} min` : undefined
                    }))}
                  selected={servicos.find(s => s.id === form.servicoId) ? {
                    id: form.servicoId,
                    nome: servicos.find(s => s.id === form.servicoId)?.nome || '',
                    sigla: servicos.find(s => s.id === form.servicoId)?.duracaoMinutos ? `${servicos.find(s => s.id === form.servicoId)?.duracaoMinutos} min` : undefined
                  } : null}
                  onChange={(selected) => {
                    if (selected) {
                      const servico = servicos.find(s => s.id === selected.id);
                      if (servico) {
                        onFormChange({
                          servicoId: servico.id,
                          duracaoMinutos: servico.duracaoMinutos !== undefined && servico.duracaoMinutos !== null ? String(servico.duracaoMinutos) : '',
                          preco: servico.preco !== undefined && servico.preco !== null ? String(servico.preco) : '',
                          percentualClinica: servico.percentualClinica !== undefined && servico.percentualClinica !== null ? String(servico.percentualClinica) : '',
                          percentualProfissional: servico.percentualProfissional !== undefined && servico.percentualProfissional !== null ? String(servico.percentualProfissional) : '',
                        });
                      }
                    } else {
                      onFormChange({ servicoId: '' });
                    }
                  }}
                  placeholder="Buscar serviço..."
                  headerText="Serviços disponíveis"
                  formatOption={(option) => {
                    return option.sigla ? `${option.nome} - ${option.sigla}` : option.nome;
                  }}
                />
              </div>
            </div>
            {/* Linha 2 - Informações do Serviço Selecionado */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-lg">📊</span>
                Informações do Serviço Selecionado
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <span className="text-sm">💰</span>
                    Preço Tabelado
                  </label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-medium">
                    R$ {form.preco !== undefined && form.preco !== null && form.preco !== ''
                      ? Number(form.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '0,00'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <span className="text-sm">⏱️</span>
                    Duração
                  </label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-medium">
                    {form.duracaoMinutos !== undefined && form.duracaoMinutos !== null && form.duracaoMinutos !== ''
                      ? `${String(parseInt(form.duracaoMinutos, 10))} min`
                      : '0 min'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <span className="text-sm">🏥</span>
                    Clínica
                  </label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-medium">
                    {form.percentualClinica !== undefined && form.percentualClinica !== null && form.percentualClinica !== ''
                      ? `${Number(form.percentualClinica).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                      : '0,00%'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <span className="text-sm">👨‍⚕️</span>
                    Profissional
                  </label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-medium">
                    {form.percentualProfissional !== undefined && form.percentualProfissional !== null && form.percentualProfissional !== ''
                      ? `${Number(form.percentualProfissional).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                      : '0,00%'}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border-2 border-yellow-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="text-lg">💵</span>
                Preço Especial para o Paciente <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
                <input
                  type="text"
                  value={form.precoPaciente ?? ''}
                  onChange={e => {
                    let valor = e.target.value.replace(/[^\d,]/g, '');
                    valor = valor.replace(/,+/g, ',');
                    onFormChange({ precoPaciente: valor });
                  }}
                  onBlur={e => {
                    let valor = e.target.value.replace(/[^\d,]/g, '');
                    valor = valor.replace(/,+/g, ',');
                    if (!valor || isNaN(Number(valor.replace(',', '.')))) {
                      onFormChange({ precoPaciente: '00,00' });
                    } else {
                      onFormChange({ precoPaciente: Number(valor.replace(',', '.')).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) });
                    }
                  }}
                  placeholder="0,00"
                  className="w-full pl-10 pr-4 py-3 border-2 border-yellow-300 rounded-xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-500 transition-all duration-200 font-semibold text-lg text-gray-800 bg-white hover:border-yellow-400"
                  disabled={formLoading}
                  required
                />
              </div>
              <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                <span className="text-sm">💡</span>
                Este será o valor cobrado especificamente deste paciente
              </p>
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
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200 "
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