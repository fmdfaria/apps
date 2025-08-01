import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/FileUpload';
import { File } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { Paciente } from '@/types/Paciente';
import type { Anexo } from '@/types/Anexo';
import { uploadAnexo, getAnexos, deleteAnexo } from '@/services/anexos';

interface AnexoPacientesModalProps {
  showModal: boolean;
  paciente: Paciente | null;
  anexoFiles: File[];
  anexoDescricao: string;
  anexos: Anexo[];
  anexoError: string;
  saving: boolean;
  anexoToDelete: Anexo | null;
  deletingAnexo: boolean;
  onClose: () => void;
  onAnexoFilesChange: (files: File[]) => void;
  onAnexoDescricaoChange: (descricao: string) => void;
  onAnexosChange: (anexos: Anexo[]) => void;
  onAnexoErrorChange: (error: string) => void;
  onSavingChange: (saving: boolean) => void;
  onAnexoToDeleteChange: (anexo: Anexo | null) => void;
  onDeletingAnexoChange: (deleting: boolean) => void;
}

export default function AnexoPacientesModal({
  showModal,
  paciente,
  anexoFiles,
  anexoDescricao,
  anexos,
  anexoError,
  saving,
  anexoToDelete,
  deletingAnexo,
  onClose,
  onAnexoFilesChange,
  onAnexoDescricaoChange,
  onAnexosChange,
  onAnexoErrorChange,
  onSavingChange,
  onAnexoToDeleteChange,
  onDeletingAnexoChange
}: AnexoPacientesModalProps) {
  const { toast } = useToast();

  const handleSalvarAnexo = async () => {
    if (!paciente || anexoFiles.length === 0) return;
    
    if (!anexoDescricao.trim()) {
      onAnexoErrorChange('Descrição é obrigatória.');
      return;
    }

    onSavingChange(true);
    onAnexoErrorChange('');

    try {
      await uploadAnexo({
        file: anexoFiles[0],
        descricao: anexoDescricao,
        entidadeId: paciente.id,
        bucket: 'pacientes',
      });

      // Atualizar lista de anexos após upload
      const anexosDb = await getAnexos(paciente.id);
      onAnexosChange(anexosDb);
      onAnexoFilesChange([]);
      onAnexoDescricaoChange('');

      toast({
        title: 'Anexo enviado com sucesso!',
        variant: 'success',
      });
    } catch (err: any) {
      let msg = 'Erro ao enviar anexo.';
      if (err?.response?.data?.message) msg = err.response.data.message;
      else if (err?.response?.data?.error) msg = err.response.data.error;
      onAnexoErrorChange(msg);
      toast({
        title: 'Erro ao enviar anexo',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      onSavingChange(false);
    }
  };

  return (
    <>
      <Dialog open={showModal} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-2xl">📎</span>
              Anexos - {paciente?.nomeCompleto}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Upload de novo anexo */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border-2 border-blue-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-lg">📤</span>
                  Enviar Novo Anexo
                </h4>
                
                <div className="flex flex-col gap-3">
                  <FileUpload 
                    files={anexoFiles} 
                    onFilesChange={onAnexoFilesChange} 
                    acceptedTypes=".pdf,.jpg,.jpeg,.png" 
                    maxFiles={1} 
                    label="Selecione o arquivo" 
                  />
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-lg">📝</span>
                      Descrição {anexoFiles.length > 0 && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={anexoDescricao}
                      onChange={e => onAnexoDescricaoChange(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-blue-300"
                      placeholder="Digite uma descrição para o anexo..."
                      disabled={saving}
                    />
                  </div>
  
  
                </div>
              </div>
  
              {/* Lista de anexos existentes */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  Anexos Enviados ({anexos.length})
                </h4>
                
                {anexos.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-2xl">📁</span>
                    </div>
                    <p className="text-gray-500 font-medium text-sm">Nenhum anexo enviado ainda</p>
                    <p className="text-gray-400 text-xs">Use o formulário ao lado para enviar</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {anexos.map((anexo) => (
                      <div key={anexo.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <File className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        
                        <div className="flex-1 min-w-0">
                          <a 
                            href={anexo.url || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:text-blue-800 font-medium underline block truncate text-sm"
                            title={anexo.nomeArquivo}
                          >
                            {anexo.nomeArquivo}
                          </a>
                          {anexo.descricao && (
                            <p className="text-xs text-gray-500 truncate">{anexo.descricao}</p>
                          )}
                        </div>
                        
                        <Button 
                          type="button" 
                          size="sm"
                          variant="outline"
                          className="group border border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-2 focus:ring-red-300 h-6 w-6 p-0 shadow-sm hover:shadow-md transition-all duration-200"
                          onClick={() => onAnexoToDeleteChange(anexo)}
                          title="Excluir Anexo"
                        >
                          <span className="sr-only">Excluir</span>
                          <span className="text-xs">×</span>
                        </Button>
                      </div>
                    ))}
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
                  disabled={saving}
                  className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6 transition-all duration-200"
                >
                  <span className="mr-2">🔴</span>
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                onClick={handleSalvarAnexo}
                disabled={saving}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200 "
              >
                {saving ? (
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
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão de anexo */}
      <AlertDialog open={!!anexoToDelete} onOpenChange={open => !open && onAnexoToDeleteChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão de Anexo</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="py-2">
            Tem certeza que deseja excluir o anexo 
            <b
              className="inline-block max-w-xs truncate align-bottom ml-1"
              title={anexoToDelete?.nomeArquivo}
            >
              "{anexoToDelete?.nomeArquivo}"
            </b>?
            <p className="text-sm text-gray-500 mt-2">Esta ação não pode ser desfeita.</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={deletingAnexo} 
              onClick={() => onAnexoToDeleteChange(null)} 
              className="border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-700 font-semibold"
            >
              <span className="mr-2">❌</span>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              disabled={deletingAnexo} 
              onClick={async () => {
                if (!anexoToDelete) return;
                onDeletingAnexoChange(true);
                try {
                  await deleteAnexo(anexoToDelete.id);
                  onAnexosChange(anexos.filter(a => a.id !== anexoToDelete.id));
                  onAnexoToDeleteChange(null);
                  toast({
                    title: 'Anexo excluído com sucesso!',
                    variant: 'success',
                  });
                } catch (err: any) {
                  let msg = 'Erro ao excluir anexo.';
                  if (err?.response?.data?.message) msg = err.response.data.message;
                  else if (err?.response?.data?.error) msg = err.response.data.error;
                  toast({
                    title: 'Erro ao excluir anexo',
                    description: msg,
                    variant: 'destructive',
                  });
                } finally {
                  onDeletingAnexoChange(false);
                }
              }} 
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
            >
              {deletingAnexo ? (
                <>
                  <span className="mr-2">⏳</span>
                  Excluindo...
                </>
              ) : (
                <>
                  <span className="mr-2">🗑️</span>
                  Excluir Anexo
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}