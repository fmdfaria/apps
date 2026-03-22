import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { FormErrorMessage } from '@/components/form-error-message';
import { createEvolucao, updateEvolucao, deleteEvolucao } from '@/services/evolucoes';
import { getProfissionais } from '@/services/profissionais';
import { AppToast } from '@/services/toast';
import { useAuth } from '@/hooks/useAuth';
import type { EvolucaoPaciente, CreateEvolucaoPacienteData } from '@/types/EvolucaoPaciente';
import type { Agendamento } from '@/types/Agendamento';
import type { Paciente } from '@/types/Paciente';
import type { Profissional } from '@/types/Profissional';
import { 
  User, 
  Users,
  Calendar, 
  Target, 
  FileText,
  Save,
  X
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

interface EvolucaoPacientesModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDeleted?: (agendamentoId: string) => void;
  pacientes: Paciente[];
  evolucaoParaEditar?: EvolucaoPaciente | null;
  agendamentoInicial?: Agendamento | null;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

interface ExtendedCreateEvolucaoPacienteData extends CreateEvolucaoPacienteData {
  profissionalId?: string;
}

export default function EvolucaoPacientesModal({ 
  open, 
  onClose, 
  onSuccess, 
  onDeleted,
  pacientes, 
  evolucaoParaEditar,
  agendamentoInicial,
  canCreate = true,
  canUpdate = true,
  canDelete = true
}: EvolucaoPacientesModalProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<ExtendedCreateEvolucaoPacienteData>({
    pacienteId: '',
    agendamentoId: undefined,
    dataEvolucao: new Date().toISOString().split('T')[0],
    objetivoSessao: '',
    descricaoEvolucao: '',
    profissionalId: '',
  });
  
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pacienteNome, setPacienteNome] = useState('');
  const [profissionalNome, setProfissionalNome] = useState('');
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loadingProfissionais, setLoadingProfissionais] = useState(false);

  // Helper: formata data (string Date ou ISO) para YYYY-MM-DD para inputs type=date
  const formatDateToInput = (data: string | Date | undefined | null) => {
    if (!data) return '';
    let dataObj: Date;
    if (typeof data === 'string') {
      if (data.includes('T') && !data.endsWith('Z')) {
        dataObj = new Date(data + 'Z');
      } else {
        dataObj = new Date(data);
      }
    } else {
      dataObj = new Date(data);
    }
    const ano = dataObj.getUTCFullYear();
    const mes = String(dataObj.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(dataObj.getUTCDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const isEditing = !!evolucaoParaEditar;
  const isProfissional = user?.roles?.includes('PROFISSIONAL');
  const isStandalone = !agendamentoInicial; // Evolução standalone (sem agendamento)
  const isDataEvolucaoTravada = !!agendamentoInicial;

  // Carregar profissionais sempre que o modal abrir
  useEffect(() => {
    if (open) {
      const carregarProfissionais = async () => {
        try {
          setLoadingProfissionais(true);
          const profissionaisData = await getProfissionais({ ativo: true });
          setProfissionais(profissionaisData || []);
        } catch (error) {
          console.error('Erro ao carregar profissionais:', error);
          AppToast.error('Erro ao carregar profissionais');
        } finally {
          setLoadingProfissionais(false);
        }
      };
      carregarProfissionais();
    }
  }, [open]);

  // Configurar dados iniciais quando abrir o modal
  useEffect(() => {
    if (open && !evolucaoParaEditar) {
      if (agendamentoInicial) {
        // Evolução vinculada ao agendamento
        setForm(prevForm => ({
          ...prevForm,
          pacienteId: agendamentoInicial.pacienteId,
          agendamentoId: agendamentoInicial.id,
          profissionalId: agendamentoInicial.profissionalId || '',
          // Data da Evolução = Data Liberação por padrão (se existir)
          dataEvolucao: formatDateToInput(agendamentoInicial.dataCodLiberacao) || prevForm.dataEvolucao
        }));
        setPacienteNome(agendamentoInicial.pacienteNome || '');
        setProfissionalNome(agendamentoInicial.profissionalNome || '');
      } else {
        // Evolução standalone - selecionar o paciente da página
        const pacienteAtual = pacientes[0]; // Primeiro paciente da lista (único na página)
        if (pacienteAtual) {
          setForm(prevForm => ({
            ...prevForm,
            pacienteId: pacienteAtual.id,
            agendamentoId: undefined,
            profissionalId: isProfissional ? (user?.profissionalId || '') : '',
          }));
          setPacienteNome(pacienteAtual.nomeCompleto);
          
          if (isProfissional) {
            // Se é profissional, buscar nome do profissional logado da tabela profissionais
            const profissionalLogado = profissionais.find(p => p.id === user?.profissionalId);
            setProfissionalNome(profissionalLogado?.nome || '');
          } else {
            setProfissionalNome('');
          }
        }
      }
    }
  }, [open, agendamentoInicial, evolucaoParaEditar, pacientes, isProfissional, user, profissionais]);

  // Preencher form quando for edição
  useEffect(() => {
    if (open && evolucaoParaEditar) {
      // Converter data para formato YYYY-MM-DD que o input date espera
      // Tratando timezone UTC corretamente
      const formatarDataParaInput = (data: string | Date) => {
        if (!data) return '';
        
        // Se for string, criar Date e tratar como UTC
        let dataObj: Date;
        if (typeof data === 'string') {
          // Se não terminar com 'Z', é provável que seja data local
          if (data.includes('T') && !data.endsWith('Z')) {
            dataObj = new Date(data + 'Z'); // Forçar UTC
          } else {
            dataObj = new Date(data);
          }
        } else {
          dataObj = new Date(data);
        }
        
        // Usar UTC methods para evitar problemas de timezone
        const ano = dataObj.getUTCFullYear();
        const mes = String(dataObj.getUTCMonth() + 1).padStart(2, '0');
        const dia = String(dataObj.getUTCDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
      };

      setForm({
        pacienteId: evolucaoParaEditar.pacienteId,
        agendamentoId: evolucaoParaEditar.agendamentoId || undefined,
        dataEvolucao:
          formatDateToInput(agendamentoInicial?.dataCodLiberacao) ||
          formatarDataParaInput(evolucaoParaEditar.dataEvolucao),
        objetivoSessao: evolucaoParaEditar.objetivoSessao || '',
        descricaoEvolucao: evolucaoParaEditar.descricaoEvolucao || '',
        profissionalId: '', // Será definido abaixo
      });
      
      // Se tem agendamento inicial (veio da AtenderPage), usar os dados dele
      if (agendamentoInicial) {
        setPacienteNome(agendamentoInicial.pacienteNome || '');
        setProfissionalNome(agendamentoInicial.profissionalNome || '');
        setForm(prev => ({ ...prev, profissionalId: agendamentoInicial.profissionalId || '' }));
      } else {
        // Buscar nome do paciente para edição independente
        const pacienteEncontrado = pacientes.find(p => p.id === evolucaoParaEditar.pacienteId);
        setPacienteNome(pacienteEncontrado?.nomeCompleto || evolucaoParaEditar.pacienteNome || '');
        
        if (isProfissional) {
          // Se é profissional logado editando, manter o profissional original da evolução
          const profissionalOriginal = profissionais.find(p => p.id === evolucaoParaEditar.profissionalId);
          setProfissionalNome(profissionalOriginal?.nome || evolucaoParaEditar.profissionalNome || '');
          setForm(prev => ({ ...prev, profissionalId: evolucaoParaEditar.profissionalId || '' }));
        } else {
          // Se é admin/outro usuário, carregar dados do profissional original para poder trocar
          const profissionalOriginal = profissionais.find(p => p.id === evolucaoParaEditar.profissionalId);
          setProfissionalNome(profissionalOriginal?.nome || evolucaoParaEditar.profissionalNome || '');
          setForm(prev => ({ ...prev, profissionalId: evolucaoParaEditar.profissionalId || '' }));
        }
      }
    }
  }, [open, evolucaoParaEditar, pacientes, agendamentoInicial, isProfissional, user, profissionais]);


  const fecharModal = () => {
    onClose();
    setForm({
      pacienteId: '',
      agendamentoId: undefined,
      dataEvolucao: new Date().toISOString().split('T')[0],
      objetivoSessao: '',
      descricaoEvolucao: '',
      profissionalId: '',
    });
    setFormError('');
    setPacienteNome('');
    setProfissionalNome('');
    setProfissionais([]);
  };

  const handleDelete = async () => {
    if (!evolucaoParaEditar?.id) return;
    try {
      setDeleting(true);
      await deleteEvolucao(evolucaoParaEditar.id);
      AppToast.success('Evolução excluída com sucesso!');
      // Notificar página para atualizar estado local (evolucoesMap -> false)
      const agendamentoIdNotificar = evolucaoParaEditar.agendamentoId || agendamentoInicial?.id;
      if (agendamentoIdNotificar && onDeleted) {
        onDeleted(agendamentoIdNotificar);
      }
      setDeleteOpen(false);
      fecharModal();
    } catch (error) {
      AppToast.error('Erro ao excluir evolução');
    } finally {
      setDeleting(false);
    }
  };

  const validarForm = (): boolean => {
    if (!form.pacienteId) {
      setFormError('Selecione um paciente.');
      return false;
    }
    
    if (!isProfissional && !form.profissionalId) {
      setFormError('Selecione um profissional.');
      return false;
    }
    
    if (!form.dataEvolucao) {
      setFormError('A data da evolução é obrigatória.');
      return false;
    }
    
    const dataEvolucao = new Date(form.dataEvolucao);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (dataEvolucao > hoje) {
      setFormError('A data da evolução não pode ser futura.');
      return false;
    }
    
    if (!form.objetivoSessao?.trim()) {
      setFormError('O objetivo da sessão é obrigatório.');
      return false;
    }
    
    if (!form.descricaoEvolucao?.trim()) {
      setFormError('A descrição da evolução é obrigatória.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarForm()) {
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const dadosEvolucao: CreateEvolucaoPacienteData = {
        pacienteId: form.pacienteId,
        ...(form.agendamentoId && { agendamentoId: form.agendamentoId }),
        profissionalId: (isProfissional && !isEditing) ? (user?.profissionalId || undefined) : (form.profissionalId || undefined),
        dataEvolucao: isDataEvolucaoTravada
          ? (formatDateToInput(agendamentoInicial?.dataCodLiberacao) || form.dataEvolucao)
          : form.dataEvolucao,
        objetivoSessao: form.objetivoSessao?.trim() || '',
        descricaoEvolucao: form.descricaoEvolucao?.trim() || '',
      };

      if (isEditing && evolucaoParaEditar) {
        await updateEvolucao(evolucaoParaEditar.id, dadosEvolucao);
        AppToast.success('Evolução atualizada com sucesso!');
      } else {
        await createEvolucao(dadosEvolucao);
        AppToast.success('Evolução salva com sucesso!');
      }
      
      onSuccess();
      fecharModal();
    } catch (error: any) {
      console.error('Erro ao salvar evolução:', error);
      const mensagemErro = error.response?.data?.message || 
                          (isEditing ? 'Erro ao atualizar evolução' : 'Erro ao criar evolução');
      setFormError(mensagemErro);
      AppToast.error(mensagemErro);
    } finally {
      setFormLoading(false);
    }
  };


  return (
    <>
      <Dialog open={open} onOpenChange={fecharModal}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader>
            <DialogTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {isEditing ? 'Editar Evolução' : 'Evolução do Paciente'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-5">
            {/* Linha 1: Paciente | Profissional */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-semibold">Paciente</span>
                </label>
                <Input
                  type="text"
                  value={pacienteNome}
                  disabled
                  className="bg-gray-50 cursor-not-allowed"
                  placeholder="Nome do paciente"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="font-semibold">Profissional</span>
                  {!isProfissional && <span className="text-red-500">*</span>}
                </label>
                {isProfissional ? (
                  <Input
                    type="text"
                    value={profissionalNome}
                    disabled
                    className="bg-gray-50 cursor-not-allowed"
                    placeholder="Nome do profissional"
                  />
                ) : (
                  <SingleSelectDropdown
                    options={profissionais.map(p => ({ id: p.id, nome: p.nome }))}
                    selected={profissionais.find(p => p.id === form.profissionalId) ? {
                      id: form.profissionalId || '',
                      nome: profissionais.find(p => p.id === form.profissionalId)?.nome || ''
                    } : null}
                    onChange={(selected) => {
                      setForm({ ...form, profissionalId: selected?.id || '' });
                      setProfissionalNome(selected?.nome || '');
                      setFormError('');
                    }}
                    placeholder={loadingProfissionais ? "Carregando profissionais..." : "Digite para buscar ou clique para ver todos"}
                    headerText="Profissionais disponíveis"
                    dotColor="green"
                    disabled={formLoading || loadingProfissionais}
                    searchFields={['nome']}
                  />
                )}
              </div>
            </div>

            {/* Linha 2: Data Liberação | Data da Evolução */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="font-semibold">Data Liberação</span>
                </label>
                <Input
                  type="date"
                  value={formatDateToInput(agendamentoInicial?.dataCodLiberacao) || ''}
                  disabled
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="font-semibold">Data da Evolução</span>
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={form.dataEvolucao}
                  onChange={(e) => {
                    if (isDataEvolucaoTravada) return;
                    setForm({ ...form, dataEvolucao: e.target.value });
                    setFormError('');
                  }}
                  disabled={formLoading || isDataEvolucaoTravada}
                  className={isDataEvolucaoTravada ? 'bg-gray-50 cursor-not-allowed' : ''}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Linha 3: Objetivo da Sessão */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span className="font-semibold">Objetivo da Sessão</span>
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Ex: Avaliação inicial, Fortalecimento muscular, Controle da dor..."
                value={form.objetivoSessao}
                onChange={(e) => {
                  setForm({ ...form, objetivoSessao: e.target.value });
                  setFormError('');
                }}
                disabled={formLoading}
                maxLength={255}
              />
            </div>

            {/* Linha 4: Descrição da Evolução */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="font-semibold">Descrição da Evolução</span>
                <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Descreva a evolução, procedimentos e observações..."
                value={form.descricaoEvolucao}
                onChange={(e) => {
                  setForm({ ...form, descricaoEvolucao: e.target.value });
                  setFormError('');
                }}
                disabled={formLoading}
                rows={10}
                className="resize-none"
              />
              <div className="text-xs text-gray-500">
                {form.descricaoEvolucao?.length || 0} caracteres
              </div>
            </div>

            {formError && <FormErrorMessage>{formError}</FormErrorMessage>}
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button 
                type="button" 
                variant="outline" 
                disabled={formLoading}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
            </DialogClose>
            {isEditing && (
              !canDelete ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block order-first">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={true}
                          className="flex items-center gap-2 border-2 border-gray-300 text-gray-400 cursor-not-allowed opacity-50"
                          title="Você não tem permissão para excluir evoluções"
                        >
                          Excluir
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Você não tem permissão para excluir evoluções</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteOpen(true)}
                  disabled={formLoading}
                  className="flex items-center gap-2 border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 order-first"
                  title="Excluir evolução"
                >
                  Excluir
                </Button>
              )
            )}
            {(isEditing ? !canUpdate : !canCreate) ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button 
                        type="button" 
                        disabled={true}
                        className="bg-gray-400 cursor-not-allowed flex items-center gap-2 opacity-50"
                        title={`Você não tem permissão para ${isEditing ? 'atualizar' : 'criar'} evoluções`}
                      >
                        <Save className="w-4 h-4" />
                        {isEditing ? 'Atualizar Evolução' : 'Salvar Evolução'}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Você não tem permissão para {isEditing ? 'atualizar' : 'criar'} evoluções</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button 
                type="submit" 
                disabled={formLoading}
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                {formLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {formLoading 
                  ? (isEditing ? 'Atualizando...' : 'Salvando...') 
                  : (isEditing ? 'Atualizar Evolução' : 'Salvar Evolução')
                }
              </Button>
            )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Evolução"
        entityName={pacienteNome || 'Evolução'}
        entityType="evolução"
        isLoading={deleting}
        loadingText="Excluindo..."
        confirmText="Excluir"
      />
    </>
  );
}
