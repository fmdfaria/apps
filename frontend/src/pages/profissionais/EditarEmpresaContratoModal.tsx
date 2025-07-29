import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormErrorMessage } from '@/components/form-error-message';
import { updateProfissionalEmpresaContrato } from '@/services/profissionais';
import { useInputMask } from '@/hooks/useInputMask';
import type { Profissional } from '@/types/Profissional';

interface EditarEmpresaContratoModalProps {
  open: boolean;
  onClose: () => void;
  profissional: Profissional | null;
  onSalvar: () => void;
}

export default function EditarEmpresaContratoModal({ open, onClose, profissional, onSalvar }: EditarEmpresaContratoModalProps) {
  const [form, setForm] = useState({
    cnpj: '',
    razaoSocial: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const maskCNPJ = useInputMask('99.999.999/9999-99');

  useEffect(() => {
    if (open && profissional) {
      setForm({
        cnpj: profissional.cnpj || '',
        razaoSocial: profissional.razaoSocial || '',
      });
      setError('');
    }
  }, [open, profissional]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profissional) return;

    setLoading(true);
    setError('');

    try {
      // Atualizar dados de empresa/contrato
      await updateProfissionalEmpresaContrato(profissional.id, form);

      onSalvar();
      onClose();
    } catch (err: any) {
      let msg = 'Erro ao salvar dados da empresa.';
      if (err?.response?.data) {
        if (typeof err.response.data === 'string') {
          msg = err.response.data;
        } else if (err.response.data.message) {
          msg = err.response.data.message;
        } else if (err.response.data.error) {
          msg = err.response.data.error;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Empresa/Contrato - {profissional?.nome}</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
              <input
                type="text"
                value={form.cnpj}
                onChange={e => setForm(f => ({ ...f, cnpj: maskCNPJ(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={18}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social</label>
              <input
                type="text"
                value={form.razaoSocial}
                onChange={e => setForm(f => ({ ...f, razaoSocial: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="flex-1">
              {error && <FormErrorMessage>{error}</FormErrorMessage>}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="cancel" disabled={loading}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? 'Salvando...' : 'Salvar Dados da Empresa'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 