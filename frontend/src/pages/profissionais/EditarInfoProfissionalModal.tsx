import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FormErrorMessage } from '@/components/form-error-message';
import { FileUpload } from '@/components/ui/FileUpload';
import { MultiSelectDropdown } from '@/components/ui/multiselect-dropdown';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { updateProfissionalInfoProfissional, deleteProfissionalComprovanteRegistro } from '@/services/profissionais';
import { getEspecialidades } from '@/services/especialidades';
import { getConselhos } from '@/services/conselhos';
import { uploadAnexo, getAnexos, deleteAnexo } from '@/services/anexos';
import type { Profissional } from '@/types/Profissional';
import type { Especialidade } from '@/types/Especialidade';
import type { Anexo } from '@/types/Anexo';

interface EditarInfoProfissionalModalProps {
  open: boolean;
  onClose: () => void;
  profissional: Profissional | null;
  onSalvar: () => void;
}

export default function EditarInfoProfissionalModal({ open, onClose, profissional, onSalvar }: EditarInfoProfissionalModalProps) {
  const [form, setForm] = useState({
    conselhoId: '',
    numeroConselho: '',
    especialidadesIds: [] as string[],
  });
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovanteAnexo, setComprovanteAnexo] = useState<Anexo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [conselhos, setConselhos] = useState<{ id: string, nome: string }[]>([]);

  useEffect(() => {
    if (open) {
      // Carregar opções
      getEspecialidades().then(setEspecialidades);
      getConselhos().then(setConselhos);
    }
  }, [open]);

  useEffect(() => {
    if (open && profissional) {
      setForm({
        conselhoId: profissional.conselhoId || '',
        numeroConselho: profissional.numeroConselho || '',
        especialidadesIds: Array.isArray(profissional.especialidades)
          ? profissional.especialidades.map(e => e.id)
          : (profissional.especialidadesIds || []),
      });
      setComprovanteFile(null);
      setComprovanteAnexo(null);
      setShowDeleteConfirm(false);
      setError('');
      
      // Verificar se há comprovante existente no campo direto do profissional
      if (profissional.comprovanteRegistro) {
        setComprovanteAnexo({
          id: 'temp', // ID temporário
          entidadeId: profissional.id,
          bucket: 'profissionais',
          nomeArquivo: 'Comprovante de Registro',
          descricao: 'comprovante_registro',
          url: profissional.comprovanteRegistro,
        });
      }
    }
  }, [open, profissional]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profissional) return;

    setLoading(true);
    setError('');

    try {
      // Atualizar informações profissionais
      await updateProfissionalInfoProfissional(profissional.id, {
        ...form,
        file: comprovanteFile,
      });



      onSalvar();
      onClose();
    } catch (err: any) {
      let msg = 'Erro ao salvar informações profissionais.';
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
      await deleteProfissionalComprovanteRegistro(profissional.id);
    setComprovanteAnexo(null);
    setComprovanteFile(null);
      setShowDeleteConfirm(false);
      onSalvar(); // Atualizar a lista de profissionais
    } catch (err) {
      setError('Erro ao deletar comprovante de registro.');
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
            <DialogTitle>Editar Informações Profissionais - {profissional?.nome}</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Especialidades <span className="text-red-500">*</span></label>
              <MultiSelectDropdown
                options={especialidades}
                selected={especialidades.filter(e => form.especialidadesIds.includes(e.id))}
                onChange={opts => setForm(f => ({ ...f, especialidadesIds: opts.map(o => o.id) }))}
                placeholder="Digite para buscar ou criar uma especialidade"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conselho</label>
                <Select value={form.conselhoId} onValueChange={v => setForm(f => ({ ...f, conselhoId: v }))}>
                  <SelectTrigger className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <SelectValue placeholder="Selecione o conselho" />
                  </SelectTrigger>
                  <SelectContent>
                    {conselhos.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número Conselho</label>
                <input
                  type="text"
                  value={form.numeroConselho}
                  onChange={e => setForm(f => ({ ...f, numeroConselho: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comprovante de Registro</label>
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
                  label="Comprovante de Registro"
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
                {loading ? 'Salvando...' : 'Salvar Informações'}
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
            Tem certeza que deseja excluir o <b>comprovante de registro</b>?
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