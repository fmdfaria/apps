import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

          <div className="py-2 space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                <span className="text-lg">🏢</span>
                <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-semibold">CNPJ</span>
              </label>
              <Input
                type="text"
                value={form.cnpj}
                onChange={e => setForm(f => ({ ...f, cnpj: maskCNPJ(e.target.value) }))}
                className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100 font-mono"
                maxLength={18}
                disabled={loading}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                <span className="text-lg">🏛️</span>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">Razão Social</span>
              </label>
              <Input
                type="text"
                value={form.razaoSocial}
                onChange={e => setForm(f => ({ ...f, razaoSocial: e.target.value }))}
                className="hover:border-purple-300 focus:border-purple-500 focus:ring-purple-100"
                disabled={loading}
                placeholder="Nome completo da empresa"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6 transition-all duration-200"
              >
                <span className="mr-2">🔴</span>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl  font-semibold px-8 transition-all duration-200 "
            >
              {loading ? (
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