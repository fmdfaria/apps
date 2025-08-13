import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormErrorMessage } from '@/components/form-error-message';
import { createProfissional } from '@/services/profissionais';
import { createUser } from '@/services/users';
import { useInputMask } from '@/hooks/useInputMask';

interface CriarProfissionalModalProps {
  open: boolean;
  onClose: () => void;
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

// Função para remover máscara e retornar apenas números
const removeWhatsAppMask = (value: string) => {
  return value.replace(/\D/g, '');
};

export default function CriarProfissionalModal({ open, onClose, onSuccess }: CriarProfissionalModalProps) {
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    email: '',
    whatsapp: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const maskCPF = useInputMask('999.999.999-99');

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
    if (!form.whatsapp || !telefoneValido) {
      setFormError('WhatsApp obrigatório e deve ser válido. Exemplo: +55 (11) 99999-9999');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const profissionalPayload = {
        nome: form.nome.trim(),
        cpf: form.cpf,
        email: form.email.trim(),
        whatsapp: form.whatsapp ? removeWhatsAppMask(form.whatsapp) : null,
      };

      const profissional = await createProfissional(profissionalPayload);

      // Criar usuário vinculado ao profissional recém-criado
      await createUser({
        nome: form.nome.trim(),
        email: form.email.trim(),
        whatsapp: removeWhatsAppMask(form.whatsapp),
        profissionalId: profissional.id,
      });
      onSuccess();
      fecharModal();
    } catch (err: any) {
      let msg = 'Erro ao criar profissional.';
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
            <DialogTitle>Novo Profissional - Dados Básicos</DialogTitle>
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
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl shadow-sm">
              <p className="text-sm text-blue-700 flex items-start gap-2">
                <span className="text-lg flex-shrink-0 mt-0.5">📝</span>
                <span>
                  <strong className="font-semibold">Informação:</strong> Após criar o profissional, você poderá editar as informações complementares como endereço, especialidades, dados bancários etc.
                </span>
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
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl  font-semibold px-8 transition-all duration-200 "
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