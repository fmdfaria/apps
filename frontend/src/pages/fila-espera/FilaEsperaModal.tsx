import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormErrorMessage } from '@/components/form-error-message';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { AppToast } from '@/services/toast';
import type { FilaEspera, HorarioPreferencia } from '@/types/FilaEspera';
import type { Paciente } from '@/types/Paciente';
import type { Servico } from '@/types/Servico';
import type { Profissional } from '@/types/Profissional';
import { getPacientes } from '@/services/pacientes';
import { getServicos } from '@/services/servicos';
import { getProfissionais } from '@/services/profissionais';
import { createFilaEspera, updateFilaEspera } from '@/services/fila-espera';

interface FormFilaEspera {
  pacienteId: string;
  servicoId: string;
  profissionalId: string;
  horarioPreferencia: HorarioPreferencia;
  observacao: string;
  status: string;
  ativo: boolean;
}

interface FilaEsperaModalProps {
  isOpen: boolean;
  editando?: FilaEspera | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const horarioOptions = [
  { id: 'MANHÃ', nome: 'Manhã (6h às 12h)' },
  { id: 'TARDE', nome: 'Tarde (12h às 18h)' },
  { id: 'NOITE', nome: 'Noite (18h às 22h)' }
];

const statusOptions = [
  { id: 'pendente', nome: 'Pendente' },
  { id: 'agendado', nome: 'Agendado' },
  { id: 'cancelado', nome: 'Cancelado' },
  { id: 'finalizado', nome: 'Finalizado' }
];

export default function FilaEsperaModal({
  isOpen,
  editando,
  onClose,
  onSuccess
}: FilaEsperaModalProps) {
  const [form, setForm] = useState<FormFilaEspera>({
    pacienteId: '',
    servicoId: '',
    profissionalId: '',
    horarioPreferencia: 'MANHÃ',
    observacao: '',
    status: 'pendente',
    ativo: true
  });

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  // Estados para as opções dos dropdowns
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar dados quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Preencher form quando editando
  useEffect(() => {
    if (editando) {
      setForm({
        pacienteId: editando.pacienteId || '',
        servicoId: editando.servicoId || '',
        profissionalId: editando.profissionalId || '',
        horarioPreferencia: editando.horarioPreferencia,
        observacao: editando.observacao || '',
        status: editando.status || 'pendente',
        ativo: editando.ativo ?? true
      });
    } else {
      resetForm();
    }
  }, [editando, isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pacientesData, servicosData, profissionaisData] = await Promise.all([
        getPacientes(),
        getServicos(),
        getProfissionais()
      ]);
      
      setPacientes(pacientesData.data || pacientesData);
      setServicos(servicosData.data || servicosData);
      setProfissionais(profissionaisData.data || profissionaisData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      AppToast.error('Erro ao carregar dados', {
        description: 'Não foi possível carregar as opções. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      pacienteId: '',
      servicoId: '',
      profissionalId: '',
      horarioPreferencia: 'MANHÃ',
      observacao: '',
      status: 'pendente',
      ativo: true
    });
    setFormError('');
  };

  const handleFormChange = (updates: Partial<FormFilaEspera>) => {
    setForm(prev => ({ ...prev, ...updates }));
    if (formError) setFormError('');
  };

  const validateForm = () => {
    if (!form.pacienteId) {
      setFormError('Selecione um paciente.');
      return false;
    }
    if (!form.servicoId) {
      setFormError('Selecione um serviço.');
      return false;
    }
    if (!form.horarioPreferencia) {
      setFormError('Selecione um horário de preferência.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const payload = {
        ...form,
        profissionalId: form.profissionalId || null
      };

      if (editando) {
        await updateFilaEspera(editando.id, payload);
        AppToast.updated('Item da Fila', 'Item atualizado com sucesso.');
      } else {
        await createFilaEspera(payload);
        AppToast.created('Item da Fila', 'Item adicionado à fila de espera com sucesso.');
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
        (editando ? 'Erro ao atualizar item na fila' : 'Erro ao adicionar item à fila');
      setFormError(errorMessage);
      AppToast.error(editando ? 'Erro ao atualizar' : 'Erro ao criar', {
        description: errorMessage
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleClose = () => {
    if (!formLoading) {
      resetForm();
      onClose();
    }
  };

  // Exibir toast de erro quando formError mudar
  useEffect(() => {
    if (formError) {
      AppToast.validation('Erro na validação', formError);
    }
  }, [formError]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-purple-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-2xl">📋</span>
              {editando ? 'Editar Item da Fila' : 'Adicionar à Fila de Espera'}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-6">
            {/* Linha 1: Paciente | Serviço */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">👤</span>
                  Paciente <span className="text-red-500">*</span>
                </label>
                <div className="w-full">
                  <SingleSelectDropdown
                    options={pacientes.map(paciente => ({ 
                      id: paciente.id, 
                      nome: paciente.nomeCompleto,
                      whatsapp: paciente.whatsapp
                    }))}
                    selected={pacientes.find(p => p.id === form.pacienteId) ? {
                      id: form.pacienteId,
                      nome: pacientes.find(p => p.id === form.pacienteId)?.nomeCompleto || ''
                    } : null}
                    onChange={(selected) => {
                      handleFormChange({ pacienteId: selected?.id || '' });
                    }}
                    placeholder={loading ? "Carregando pacientes..." : "Selecione um paciente..."}
                    headerText="Pacientes"
                    formatOption={(option) => (
                      <div className="flex flex-col">
                        <span className="font-medium">{option.nome}</span>
                        {(option as any).whatsapp && (
                          <span className="text-xs text-gray-500">📱 {(option as any).whatsapp}</span>
                        )}
                      </div>
                    )}
                    searchFields={['nome']}
                    disabled={formLoading || loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">🩺</span>
                  Serviço <span className="text-red-500">*</span>
                </label>
                <div className="w-full">
                  <SingleSelectDropdown
                    options={servicos.map(servico => ({ 
                      id: servico.id, 
                      nome: servico.nome,
                      duracao: servico.duracaoMinutos
                    }))}
                    selected={servicos.find(s => s.id === form.servicoId) ? {
                      id: form.servicoId,
                      nome: servicos.find(s => s.id === form.servicoId)?.nome || ''
                    } : null}
                    onChange={(selected) => {
                      handleFormChange({ servicoId: selected?.id || '' });
                    }}
                    placeholder={loading ? "Carregando serviços..." : "Selecione um serviço..."}
                    headerText="Serviços"
                    formatOption={(option) => (
                      <div className="flex flex-col">
                        <span className="font-medium">{option.nome}</span>
                        {(option as any).duracao && (
                          <span className="text-xs text-gray-500">⏱️ {(option as any).duracao} min</span>
                        )}
                      </div>
                    )}
                    searchFields={['nome']}
                    disabled={formLoading || loading}
                  />
                </div>
              </div>
            </div>

            {/* Linha 2: Profissional | Horário de Preferência */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">👨‍⚕️</span>
                  Profissional <span className="text-gray-400 text-xs">(opcional)</span>
                </label>
                <div className="w-full">
                  <SingleSelectDropdown
                    options={profissionais.map(prof => ({ 
                      id: prof.id, 
                      nome: prof.nome,
                      especialidade: prof.especialidadeNome
                    }))}
                    selected={profissionais.find(p => p.id === form.profissionalId) ? {
                      id: form.profissionalId,
                      nome: profissionais.find(p => p.id === form.profissionalId)?.nome || ''
                    } : null}
                    onChange={(selected) => {
                      handleFormChange({ profissionalId: selected?.id || '' });
                    }}
                    placeholder={loading ? "Carregando profissionais..." : "Selecione um profissional (opcional)..."}
                    headerText="Profissionais"
                    formatOption={(option) => (
                      <div className="flex flex-col">
                        <span className="font-medium">{option.nome}</span>
                        {(option as any).especialidade && (
                          <span className="text-xs text-gray-500">🩺 {(option as any).especialidade}</span>
                        )}
                      </div>
                    )}
                    searchFields={['nome']}
                    disabled={formLoading || loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">⏰</span>
                  Horário de Preferência <span className="text-red-500">*</span>
                </label>
                <div className="w-full">
                  <SingleSelectDropdown
                    options={horarioOptions}
                    selected={horarioOptions.find(h => h.id === form.horarioPreferencia) || null}
                    onChange={(selected) => {
                      handleFormChange({ horarioPreferencia: (selected?.id as HorarioPreferencia) || 'MANHÃ' });
                    }}
                    placeholder="Selecione um horário..."
                    headerText="Horários de Preferência"
                    formatOption={(option) => option.nome}
                    disabled={formLoading}
                  />
                </div>
              </div>
            </div>

            {/* Linha 3: Status | Ativo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  Status
                </label>
                <div className="w-full">
                  <SingleSelectDropdown
                    options={statusOptions}
                    selected={statusOptions.find(s => s.id === form.status) || null}
                    onChange={(selected) => {
                      handleFormChange({ status: selected?.id || 'pendente' });
                    }}
                    placeholder="Selecione o status..."
                    headerText="Status do Item"
                    formatOption={(option) => option.nome}
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  Item Ativo
                </label>
                <div className="flex items-center gap-3 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ativo"
                      checked={form.ativo === true}
                      onChange={() => handleFormChange({ ativo: true })}
                      disabled={formLoading}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-green-600">Ativo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ativo"
                      checked={form.ativo === false}
                      onChange={() => handleFormChange({ ativo: false })}
                      disabled={formLoading}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-600">Inativo</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Linha 4: Observações */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="text-lg">💬</span>
                Observações
              </label>
              <textarea
                value={form.observacao}
                onChange={e => handleFormChange({ observacao: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-blue-300"
                placeholder="Observações sobre o item da fila (opcional)..."
                rows={3}
                disabled={formLoading}
              />
            </div>

            {formError && <FormErrorMessage>{formError}</FormErrorMessage>}

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
                disabled={formLoading || loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
              >
                {formLoading ? (
                  <>
                    <span className="mr-2">⏳</span>
                    {editando ? 'Atualizando...' : 'Salvando...'}
                  </>
                ) : (
                  <>
                    <span className="mr-2">🟢</span>
                    {editando ? 'Atualizar' : 'Adicionar à Fila'}
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