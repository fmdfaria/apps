import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormErrorMessage } from '@/components/form-error-message';
import { FileUpload } from '@/components/ui/FileUpload';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { updateProfissionalDadosBancarios, deleteProfissionalComprovanteBancario } from '@/services/profissionais';
import { uploadAnexo, getAnexos, deleteAnexo } from '@/services/anexos';
import { getBancos } from '@/services/bancos';
import { useInputMask } from '@/hooks/useInputMask';
import type { Profissional } from '@/types/Profissional';
import type { Anexo } from '@/types/Anexo';
import type { Banco } from '@/types/Banco';

interface EditarDadosBancariosModalProps {
  open: boolean;
  onClose: () => void;
  profissional: Profissional | null;
  onSalvar: () => void;
}

export default function EditarDadosBancariosModal({ open, onClose, profissional, onSalvar }: EditarDadosBancariosModalProps) {
  // Opções para os selects
  const tiposContaOptions = [
    { id: 'CORRENTE', nome: 'Conta Corrente' },
    { id: 'POUPANCA', nome: 'Poupança' },
    { id: 'SALARIO', nome: 'Conta Salário' }
  ];

  const tiposPixOptions = [
    { id: 'cpf', nome: 'CPF' },
    { id: 'cnpj', nome: 'CNPJ' },
    { id: 'email', nome: 'E-mail' },
    { id: 'telefone', nome: 'Telefone' },
    { id: 'chave_aleatoria', nome: 'Chave Aleatória' }
  ];
  const [form, setForm] = useState({
    banco: '',
    tipoConta: '',
    agencia: '',
    contaNumero: '',
    contaDigito: '',
    tipo_pix: '',
    pix: '',
  });
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovanteAnexo, setComprovanteAnexo] = useState<Anexo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loadingBancos, setLoadingBancos] = useState(false);

  const maskAgencia = useInputMask('9999');
  const maskContaNumero = useInputMask('999999999');
  const maskContaDigito = useInputMask('99');
  const maskPixCPF = useInputMask('999.999.999-99');
  const maskPixCNPJ = useInputMask('99.999.999/9999-99');
  const maskPixTelefone = useInputMask('(99) 99999-9999');

  useEffect(() => {
    if (open && profissional) {
      setForm({
        banco: profissional.banco || '',
        tipoConta: profissional.tipoConta || '',
        agencia: profissional.agencia || '',
        contaNumero: profissional.contaNumero || '',
        contaDigito: profissional.contaDigito || '',
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

  useEffect(() => {
    const fetchBancos = async () => {
      try {
        setLoadingBancos(true);
        const bancosData = await getBancos();
        setBancos(bancosData);
      } catch (err) {
        console.error('Erro ao carregar bancos:', err);
      } finally {
        setLoadingBancos(false);
      }
    };

    if (open) {
      fetchBancos();
    }
  }, [open]);

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
      // Converter os campos para o formato esperado pelo backend (snake_case)
      const payload = {
        banco: form.banco,
        tipo_conta: form.tipoConta,
        agencia: form.agencia,
        conta_numero: form.contaNumero,
        conta_digito: form.contaDigito,
        tipo_pix: form.tipo_pix,
        pix: form.pix,
        file: comprovanteFile,
      };

      await updateProfissionalDadosBancarios(profissional.id, payload);
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

          <div className="py-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">🏪</span>
                  <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent font-semibold">Banco</span>
                </label>
                <SingleSelectDropdown
                  options={bancos
                    .sort((a, b) => a.codigo.localeCompare(b.codigo))
                    .map(banco => ({
                      id: `${banco.codigo} - ${banco.nome}`,
                      nome: `${banco.codigo} - ${banco.nome}`
                    }))}
                  selected={form.banco ? {
                    id: form.banco,
                    nome: form.banco
                  } : null}
                  onChange={opt => setForm(f => ({ ...f, banco: opt?.id || '' }))}
                  placeholder={loadingBancos ? "Carregando bancos..." : "Digite para buscar..."}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">🏦</span>
                  <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent font-semibold">Tipo de Conta</span>
                </label>
                <SingleSelectDropdown
                  options={tiposContaOptions}
                  selected={tiposContaOptions.find(t => t.id === form.tipoConta) || null}
                  onChange={opt => setForm(f => ({ ...f, tipoConta: opt?.id || '' }))}
                  placeholder="Digite para buscar..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">🏢</span>
                  <span className="bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent font-semibold">Agência</span>
                </label>
                <Input
                  type="text"
                  value={form.agencia}
                  onChange={e => setForm(f => ({ ...f, agencia: maskAgencia(e.target.value) }))}
                  className="hover:border-orange-300 focus:border-orange-500 focus:ring-orange-100 font-mono"
                  disabled={loading}
                  placeholder="1234"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">🔢</span>
                  <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent font-semibold">Número da Conta</span>
                </label>
                <Input
                  type="text"
                  value={form.contaNumero}
                  onChange={e => setForm(f => ({ ...f, contaNumero: maskContaNumero(e.target.value) }))}
                  className="hover:border-cyan-300 focus:border-cyan-500 focus:ring-cyan-100 font-mono"
                  disabled={loading}
                  placeholder="123456789"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">✔️</span>
                  <span className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent font-semibold">Dígito</span>
                </label>
                <Input
                  type="text"
                  value={form.contaDigito}
                  onChange={e => setForm(f => ({ ...f, contaDigito: maskContaDigito(e.target.value) }))}
                  className="hover:border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100 font-mono"
                  disabled={loading}
                  placeholder="12"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">🔑</span>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">Tipo PIX</span>
                </label>
                <SingleSelectDropdown
                  options={tiposPixOptions}
                  selected={tiposPixOptions.find(t => t.id === form.tipo_pix) || null}
                  onChange={opt => setForm(f => ({ ...f, tipo_pix: opt?.id || '', pix: '' }))}
                  placeholder="Digite para buscar..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">💳</span>
                  <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent font-semibold">PIX</span>
                </label>
                <Input
                  type="text"
                  value={form.pix}
                  onChange={e => handlePixChange(e.target.value)}
                  className="hover:border-green-300 focus:border-green-500 focus:ring-green-100"
                  disabled={loading}
                  placeholder="Digite sua chave PIX"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                <span className="text-lg">📄</span>
                <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent font-semibold">Comprovante Bancário</span>
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
            Tem certeza que deseja excluir o <b>comprovante bancário</b>?
            <br />
            <span className="text-sm text-gray-600">Esta ação não pode ser desfeita.</span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading} className="border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-700 font-semibold">
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