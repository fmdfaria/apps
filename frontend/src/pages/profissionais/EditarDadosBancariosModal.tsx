import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FormErrorMessage } from '@/components/form-error-message';
import { FileUpload } from '@/components/ui/FileUpload';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { updateProfissionalDadosBancarios, deleteProfissionalComprovanteBancario } from '@/services/profissionais';
import { uploadAnexo, getAnexos, deleteAnexo } from '@/services/anexos';
import { useInputMask } from '@/hooks/useInputMask';
import type { Profissional } from '@/types/Profissional';
import type { Anexo } from '@/types/Anexo';

interface EditarDadosBancariosModalProps {
  open: boolean;
  onClose: () => void;
  profissional: Profissional | null;
  onSalvar: () => void;
}

export default function EditarDadosBancariosModal({ open, onClose, profissional, onSalvar }: EditarDadosBancariosModalProps) {
  const [form, setForm] = useState({
    banco: '',
    agencia: '',
    conta: '',
    tipo_pix: '',
    pix: '',
  });
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovanteAnexo, setComprovanteAnexo] = useState<Anexo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const maskAgencia = useInputMask('9999-9');
  const maskConta = useInputMask('99999999-9');
  const maskPixCPF = useInputMask('999.999.999-99');
  const maskPixCNPJ = useInputMask('99.999.999/9999-99');
  const maskPixTelefone = useInputMask('(99) 99999-9999');

  useEffect(() => {
    if (open && profissional) {
      setForm({
        banco: profissional.banco || '',
        agencia: profissional.agencia || '',
        conta: profissional.conta || '',
        tipo_pix: profissional.tipo_pix || '',
        pix: profissional.pix || '',
      });
      setComprovanteFile(null);
      setComprovanteAnexo(null);
      setShowDeleteConfirm(false);
      setError('');
      
      // Verificar se há comprovante existente no campo direto do profissional
      if (profissional.comprovanteBancario) {
        setComprovanteAnexo({
          id: 'temp', // ID temporário
          entidadeId: profissional.id,
          bucket: 'profissionais',
          nomeArquivo: 'Comprovante Bancário',
          descricao: 'comprovante_bancario',
          url: profissional.comprovanteBancario,
        });
      }
    }
  }, [open, profissional]);

  const handlePixChange = (value: string) => {
    let maskedValue = value;
    switch (form.tipo_pix) {
      case 'cpf':
        maskedValue = maskPixCPF(value);
        break;
      case 'cnpj':
        maskedValue = maskPixCNPJ(value);
        break;
      case 'telefone':
        maskedValue = maskPixTelefone(value);
        break;
      default:
        maskedValue = value;
    }
    setForm(f => ({
      ...f,
      pix: maskedValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profissional) return;

    setLoading(true);
    setError('');

    try {
      await updateProfissionalDadosBancarios(profissional.id, {
        ...form,
        file: comprovanteFile,
      });
      onSalvar();
      onClose();
    } catch (err: any) {
      let msg = 'Erro ao salvar dados bancários.';
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

  const handleRemoveComprovante = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!profissional) return;
    
    try {
      setLoading(true);
      await deleteProfissionalComprovanteBancario(profissional.id);
      setComprovanteAnexo(null);
      setComprovanteFile(null);
      setShowDeleteConfirm(false);
      onSalvar(); // Atualizar a lista de profissionais
    } catch (err) {
      setError('Erro ao deletar comprovante bancário.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComprovante = (files: File[]) => {
    setComprovanteFile(files[0] || null);
    setComprovanteAnexo(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Dados Bancários - {profissional?.nome}</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
              <input
                type="text"
                value={form.banco}
                onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                placeholder="Nome do banco"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agência</label>
                <input
                  type="text"
                  value={form.agencia}
                  onChange={e => setForm(f => ({ ...f, agencia: maskAgencia(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
                <input
                  type="text"
                  value={form.conta}
                  onChange={e => setForm(f => ({ ...f, conta: maskConta(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo PIX</label>
                <Select value={form.tipo_pix} onValueChange={v => setForm(f => ({ ...f, tipo_pix: v, pix: '' }))}>
                  <SelectTrigger className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <SelectValue placeholder="Selecione o tipo de PIX" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="chave_aleatoria">Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIX</label>
                <input
                  type="text"
                  value={form.pix}
                  onChange={e => handlePixChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comprovante Bancário</label>
              {comprovanteAnexo ? (
                <div className="flex items-center gap-2 bg-gray-50 rounded p-2">
                  <a
                    href={comprovanteAnexo.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600 truncate max-w-[300px] block"
                  >
                    {comprovanteAnexo.nomeArquivo}
                  </a>
                  <button
                    type="button"
                    className="text-red-600 hover:text-red-700 ml-2"
                    onClick={handleRemoveComprovante}
                    title="Remover comprovante"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <FileUpload
                  files={comprovanteFile ? [comprovanteFile] : []}
                  onFilesChange={handleUploadComprovante}
                  acceptedTypes=".pdf,.jpg,.jpeg,.png"
                  maxFiles={1}
                  label="Comprovante Bancário"
                />
              )}
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
                {loading ? 'Salvando...' : 'Salvar Dados Bancários'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="py-2">
            Tem certeza que deseja excluir o <b>comprovante bancário</b>?
            <br />
            <span className="text-sm text-gray-600">Esta ação não pode ser desfeita.</span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading} className="hover:bg-gray-50">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              disabled={loading} 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Excluindo...' : 'Excluir Comprovante'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
} 