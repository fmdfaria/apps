import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormErrorMessage } from '@/components/form-error-message';
import { FileUpload } from '@/components/ui/FileUpload';
import { updateProfissionalEndereco, deleteProfissionalComprovanteEndereco } from '@/services/profissionais';
import { uploadAnexo, getAnexos, deleteAnexo } from '@/services/anexos';
import type { Profissional } from '@/types/Profissional';
import type { Anexo } from '@/types/Anexo';

interface EditarEnderecoModalProps {
  open: boolean;
  onClose: () => void;
  profissional: Profissional | null;
  onSalvar: () => void;
}

export default function EditarEnderecoModal({ open, onClose, profissional, onSalvar }: EditarEnderecoModalProps) {
  const [form, setForm] = useState({
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
  });
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovanteAnexo, setComprovanteAnexo] = useState<Anexo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && profissional) {
      setForm({
        cep: profissional.cep || '',
        logradouro: profissional.logradouro || '',
        numero: profissional.numero || '',
        complemento: profissional.complemento || '',
        bairro: profissional.bairro || '',
        cidade: profissional.cidade || '',
        estado: profissional.estado || '',
      });
      setComprovanteFile(null);
      setComprovanteAnexo(null);
      setShowDeleteConfirm(false);
      setError('');

      // Verificar se há comprovante existente no campo direto do profissional
      if (profissional.comprovanteEndereco) {
        setComprovanteAnexo({
          id: 'temp', // ID temporário
          entidadeId: profissional.id,
          bucket: 'profissionais',
          nomeArquivo: 'Comprovante de Endereço',
          descricao: 'comprovante_endereco',
          url: profissional.comprovanteEndereco,
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
      // Atualizar dados do endereço
      await updateProfissionalEndereco(profissional.id, {
        ...form,
        file: comprovanteFile,
      });



      onSalvar();
      onClose();
    } catch (err: any) {
      let msg = 'Erro ao salvar endereço.';
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

  const handleCepChange = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    setForm(f => ({ ...f, cep }));

    if (cepLimpo.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(f => ({
            ...f,
            logradouro: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || '',
          }));
        }
      } catch { }
    }
  };

  const handleRemoveComprovante = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!profissional) return;

    try {
      setLoading(true);
      await deleteProfissionalComprovanteEndereco(profissional.id);
      setComprovanteAnexo(null);
      setComprovanteFile(null);
      setShowDeleteConfirm(false);
      onSalvar(); // Atualizar a lista de profissionais
    } catch (err) {
      setError('Erro ao deletar comprovante de endereço.');
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
            <DialogTitle>Editar Endereço - {profissional?.nome}</DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-10 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="flex text-sm font-medium text-gray-800 mb-1 items-center gap-2">
                  <span className="text-lg">📮</span>
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-semibold">CEP</span>
                </label>
                <Input
                  type="text"
                  value={form.cep}
                  onChange={e => handleCepChange(e.target.value)}
                  className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100 font-mono"
                  disabled={loading}
                  maxLength={9}
                  placeholder="00000000"
                />
              </div>
              <div className="col-span-4 space-y-1">
                <label className="flex text-sm font-medium text-gray-800 mb-1 items-center gap-2">
                  <span className="text-lg">🛣️</span>
                  <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent font-semibold">Logradouro</span>
                </label>
                <Input
                  type="text"
                  value={form.logradouro}
                  onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))}
                  className="hover:border-green-300 focus:border-green-500 focus:ring-green-100"
                  disabled={loading}
                  placeholder="Rua, Avenida, etc."
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="flex text-sm font-medium text-gray-800 mb-1 items-center gap-2">
                  <span className="text-lg">🔢</span>
                  <span className="bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent font-semibold">Número</span>
                </label>
                <Input
                  type="text"
                  value={form.numero}
                  onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                  className="hover:border-orange-300 focus:border-orange-500 focus:ring-orange-100 font-mono"
                  disabled={loading}
                  placeholder="123"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="flex text-sm font-medium text-gray-800 mb-1 items-center gap-2">
                  <span className="text-lg">🏠</span>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">Complemento</span>
                </label>
                <Input
                  type="text"
                  value={form.complemento}
                  onChange={e => setForm(f => ({ ...f, complemento: e.target.value }))}
                  className="hover:border-purple-300 focus:border-purple-500 focus:ring-purple-100"
                  disabled={loading}
                  placeholder="Apto..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-10 gap-4">
              <div className="col-span-4 space-y-1">
                <label className="flex text-sm font-medium text-gray-800 mb-1 items-center gap-2">
                  <span className="text-lg">🏘️</span>
                  <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent font-semibold">Bairro</span>
                </label>
                <Input
                  type="text"
                  value={form.bairro}
                  onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))}
                  className="hover:border-indigo-300 focus:border-indigo-500 focus:ring-indigo-100"
                  disabled={loading}
                  placeholder="Nome do bairro"
                />
              </div>
              <div className="col-span-4 space-y-1">
                <label className="flex text-sm font-medium text-gray-800 mb-1 items-center gap-2">
                  <span className="text-lg">🏙️</span>
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent font-semibold">Cidade</span>
                </label>
                <Input
                  type="text"
                  value={form.cidade}
                  onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                  className="hover:border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100"
                  disabled={loading}
                  placeholder="Nome da cidade"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="flex text-sm font-medium text-gray-800 mb-1 items-center gap-2">
                  <span className="text-lg">🗺️</span>
                  <span className="bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent font-semibold">Estado</span>
                </label>
                <Input
                  type="text"
                  value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                  className="hover:border-red-300 focus:border-red-500 focus:ring-red-100 font-mono"
                  disabled={loading}
                  placeholder="SP"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="flex text-sm font-medium text-gray-800 mb-2 items-center gap-2">
                <span className="text-lg">📄</span>
                <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent font-semibold">Comprovante de Endereço</span>
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
                  <div className="border-2 border-dashed border-gray-300 rounded-xl hover:border-violet-400 transition-colors duration-200">
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
            Tem certeza que deseja excluir o <b>comprovante de endereço</b>?
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