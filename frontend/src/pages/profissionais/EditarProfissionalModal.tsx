import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormErrorMessage } from '@/components/form-error-message';
import { updateProfissional } from '@/services/profissionais';
import { useInputMask } from '@/hooks/useInputMask';
import type { Profissional } from '@/types/Profissional';

interface EditarProfissionalModalProps {
  open: boolean;
  onClose: () => void;
  profissional: Profissional | null;
  onSuccess: () => void;
}

const applyWhatsAppMask = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length === 0) return '';
  if (numbers.length <= 2) return `+${numbers}`;
  if (numbers.length <= 4) return `+${numbers.slice(0, 2)} (${numbers.slice(2)}`;
  if (numbers.length <= 9) return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4)}`;
  return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`;
};

export default function EditarProfissionalModal({ open, onClose, profissional, onSuccess }: EditarProfissionalModalProps) {
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    email: '',
    whatsapp: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const maskCPF = useInputMask('999.999.999-99');

  useEffect(() => {
    if (open && profissional) {
      setForm({
        nome: profissional.nome || '',
        cpf: profissional.cpf || '',
        email: profissional.email || '',
        whatsapp: profissional.whatsapp ? applyWhatsAppMask(profissional.whatsapp) : '',
      });
      setFormError('');
    }
  }, [open, profissional]);

  const fecharModal = () => {
    onClose();
    setForm({
      nome: '',
      cpf: '',
      email: '',
      whatsapp: '',
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profissional) return;

    if (!form.nome.trim() || form.nome.trim().length < 2) {
      setFormError('O nome deve ter pelo menos 2 caracteres.');
      return;
    }
    const cpfLimpo = form.cpf.replace(/\D/g, '');
    if (!cpfLimpo || cpfLimpo.length !== 11) {
      setFormError('CPF inválido. Exemplo: xxx.xxx.xxx-xx.');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setFormError('E-mail inválido. Exemplo: nome@email.com');
      return;
    }
    const telefoneValido = /^\+55 \(\d{2}\) \d{5}-\d{4}$/.test(form.whatsapp.trim());
    if (form.whatsapp && !telefoneValido) {
      setFormError('WhatsApp inválido. Exemplo: +55 (11) 99999-9999');
      return;
    }
    
    setFormLoading(true);
    setFormError('');
    
    try {
      const profissionalPayload = {
        nome: form.nome.trim(),
        cpf: form.cpf,
        email: form.email.trim(),
        whatsapp: form.whatsapp || null,
      };
      
      await updateProfissional(profissional.id, profissionalPayload);
      onSuccess();
      fecharModal();
    } catch (err: any) {
      let msg = 'Erro ao atualizar profissional.';
      if (err?.response?.data) {
        if (typeof err.response.data === 'string') {
          msg = err.response.data;
        } else if (err.response.data.message) {
          msg = err.response.data.message;
        } else if (err.response.data.error) {
          msg = err.response.data.error;
        }
      }
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={fecharModal}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader>
            <DialogTitle>Editar Profissional - {profissional?.nome}</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                <span className="text-lg">👤</span>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">Nome Completo</span>
                <span className="text-red-500">*</span>
              </label>
              <Input 
                type="text" 
                value={form.nome} 
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} 
                className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100" 
                minLength={2} 
                disabled={formLoading} 
                autoFocus 
                placeholder="Nome completo do profissional"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                <span className="text-lg">📄</span>
                <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent font-semibold">CPF</span>
                <span className="text-red-500">*</span>
              </label>
              <Input 
                type="text" 
                value={form.cpf} 
                onChange={e => setForm(f => ({ ...f, cpf: maskCPF(e.target.value) }))} 
                className="hover:border-green-300 focus:border-green-500 focus:ring-green-100 font-mono" 
                minLength={14} 
                disabled={formLoading} 
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                <span className="text-lg">📧</span>
                <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent font-semibold">E-mail</span>
                <span className="text-red-500">*</span>
              </label>
              <Input 
                type="email" 
                value={form.email} 
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                className="hover:border-orange-300 focus:border-orange-500 focus:ring-orange-100" 
                disabled={formLoading} 
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                <span className="text-lg">📱</span>
                <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent font-semibold">WhatsApp</span>
              </label>
              <Input 
                type="text" 
                value={form.whatsapp} 
                onChange={e => setForm(f => ({ ...f, whatsapp: applyWhatsAppMask(e.target.value) }))} 
                className="hover:border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100 font-mono" 
                disabled={formLoading}
                placeholder="+55 (11) 99999-9999" 
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between">
            <div className="flex-1">
              {formError && <FormErrorMessage>{formError}</FormErrorMessage>}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="cancel" disabled={formLoading}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={formLoading}>
                {formLoading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}