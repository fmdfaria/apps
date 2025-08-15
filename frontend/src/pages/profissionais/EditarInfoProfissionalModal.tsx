import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormErrorMessage } from '@/components/form-error-message';
import { FileUpload } from '@/components/ui/FileUpload';
import { MultiSelectDropdown } from '@/components/ui/multiselect-dropdown';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { updateProfissionalInfoProfissional, deleteProfissionalComprovanteRegistro } from '@/services/profissionais';
import { getEspecialidades } from '@/services/especialidades';
import { getConselhos, type ConselhoProfissional } from '@/services/conselhos';
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
  const [conselhos, setConselhos] = useState<ConselhoProfissional[]>([]);

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

          <div className="py-2 space-y-3">
            <div>
              <label className="flex text-sm font-medium text-gray-800 mb-1 items-center gap-2">
                <span className="text-lg">🎯</span>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">Especialidades</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MultiSelectDropdown
                  options={especialidades}
                  selected={especialidades.filter(e => form.especialidadesIds.includes(e.id))}
                  onChange={opts => setForm(f => ({ ...f, especialidadesIds: opts.map(o => o.id) }))}
                  placeholder="Digite para buscar especialidades..."
                  headerText="Especialidades disponíveis"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
              <div className="space-y-1 min-w-0 overflow-hidden">
                <label className="flex text-sm font-medium text-gray-800 mb-1 items-center gap-2">
                  <span className="text-lg">⚖️</span>
                  <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent font-semibold">Conselho</span>
                </label>
                <div className="relative w-full max-w-full overflow-hidden">
                  <SingleSelectDropdown
                    options={conselhos}
                    selected={conselhos.find(c => c.id === form.conselhoId) || null}
                    onChange={opt => setForm(f => ({ ...f, conselhoId: opt?.id || '' }))}
                    placeholder="Digite para buscar conselhos..."
                    formatOption={(conselho) => `${conselho.sigla} | ${conselho.nome}`}
                    headerText="Conselhos disponíveis"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="flex text-sm font-medium text-gray-800 mb-1 items-center gap-2">
                  <span className="text-lg">🔢</span>
                  <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent font-semibold">Número do Conselho</span>
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={form.numeroConselho}
                    onChange={e => setForm(f => ({ ...f, numeroConselho: e.target.value }))}
                    className="hover:border-orange-300 focus:border-orange-500 focus:ring-orange-100 font-mono"
                    disabled={loading}
                    placeholder="Ex: 12345/SP"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="flex text-sm font-medium text-gray-800 mb-1 items-center gap-2">
                <span className="text-lg">📄</span>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">Comprovante de Registro</span>
              </label>
              <div className="relative">
                {comprovanteAnexo ? (
                  <div className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-4 shadow-sm">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-lg">📎</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={comprovanteAnexo.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium underline decoration-2 underline-offset-2 transition-colors duration-200 truncate block"
                      >
                        {comprovanteAnexo.nomeArquivo}
                      </a>
                      <p className="text-gray-500 text-xs mt-1">Clique para visualizar o arquivo</p>
                    </div>
                    <button
                      type="button"
                      className="flex-shrink-0 w-8 h-8 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center text-red-600 hover:text-red-700 transition-colors duration-200"
                      onClick={handleRemoveComprovante}
                      title="Remover comprovante"
                    >
                      <span className="text-sm font-bold">×</span>
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 transition-colors duration-200">
                    <FileUpload
                      files={comprovanteFile ? [comprovanteFile] : []}
                      onFilesChange={handleUploadComprovante}
                      acceptedTypes=".pdf,.jpg,.jpeg,.png"
                      maxFiles={1}
                      label="📤 Arraste o arquivo aqui ou clique para selecionar"
                      enableScanner={false}
                    />
                  </div>
                )}
              </div>
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