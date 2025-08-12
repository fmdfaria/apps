import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormErrorMessage } from '@/components/form-error-message';
import { createEvolucao, updateEvolucao } from '@/services/evolucoes';
import { AppToast } from '@/services/toast';
import type { EvolucaoPaciente, CreateEvolucaoPacienteData } from '@/types/EvolucaoPaciente';
import type { Agendamento } from '@/types/Agendamento';
import type { Paciente } from '@/types/Paciente';
import { 
  User, 
  Users,
  Calendar, 
  Target, 
  FileText,
  Save,
  X
} from 'lucide-react';

interface EvolucaoPacientesModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pacientes: Paciente[];
  evolucaoParaEditar?: EvolucaoPaciente | null;
  agendamentoInicial?: Agendamento | null;
}

export default function EvolucaoPacientesModal({ 
  open, 
  onClose, 
  onSuccess, 
  pacientes, 
  evolucaoParaEditar,
  agendamentoInicial
}: EvolucaoPacientesModalProps) {
  const [form, setForm] = useState<CreateEvolucaoPacienteData>({
    pacienteId: '',
    agendamentoId: undefined,
    dataEvolucao: new Date().toISOString().split('T')[0],
    objetivoSessao: '',
    descricaoEvolucao: '',
  });
  
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [pacienteNome, setPacienteNome] = useState('');
  const [profissionalNome, setProfissionalNome] = useState('');

  const isEditing = !!evolucaoParaEditar;

  // Configurar dados iniciais quando abrir o modal
  useEffect(() => {
    if (open && agendamentoInicial && !evolucaoParaEditar) {
      setForm(prevForm => ({
        ...prevForm,
        pacienteId: agendamentoInicial.pacienteId,
        agendamentoId: agendamentoInicial.id,
      }));
      setPacienteNome(agendamentoInicial.pacienteNome || '');
      setProfissionalNome(agendamentoInicial.profissionalNome || '');
    }
  }, [open, agendamentoInicial, evolucaoParaEditar]);

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
        agendamentoId: evolucaoParaEditar.agendamentoId,
        dataEvolucao: formatarDataParaInput(evolucaoParaEditar.dataEvolucao),
        objetivoSessao: evolucaoParaEditar.objetivoSessao || '',
        descricaoEvolucao: evolucaoParaEditar.descricaoEvolucao || '',
      });
      
      // Se tem agendamento inicial (veio da AtenderPage), usar os dados dele
      if (agendamentoInicial) {
        setPacienteNome(agendamentoInicial.pacienteNome || '');
        setProfissionalNome(agendamentoInicial.profissionalNome || '');
      } else {
        // Buscar nome do paciente para edição independente
        const pacienteEncontrado = pacientes.find(p => p.id === evolucaoParaEditar.pacienteId);
        setPacienteNome(pacienteEncontrado?.nomeCompleto || evolucaoParaEditar.pacienteNome || '');
        setProfissionalNome(''); // Para edição independente, não temos o profissional
      }
    }
  }, [open, evolucaoParaEditar, pacientes, agendamentoInicial]);


  const fecharModal = () => {
    onClose();
    setForm({
      pacienteId: '',
      agendamentoId: undefined,
      dataEvolucao: new Date().toISOString().split('T')[0],
      objetivoSessao: '',
      descricaoEvolucao: '',
    });
    setFormError('');
    setPacienteNome('');
    setProfissionalNome('');
  };

  const validarForm = (): boolean => {
    if (!form.pacienteId) {
      setFormError('Selecione um paciente.');
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
      const dadosEvolucao = {
        ...form,
        objetivoSessao: form.objetivoSessao?.trim(),
        descricaoEvolucao: form.descricaoEvolucao?.trim(),
      };

      if (isEditing && evolucaoParaEditar) {
        await updateEvolucao(evolucaoParaEditar.id, dadosEvolucao);
        AppToast.success('Evolução atualizada com sucesso!');
      } else {
        await createEvolucao(dadosEvolucao);
        AppToast.success('Evolução criada com sucesso!');
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
    <Dialog open={open} onOpenChange={fecharModal}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            {isEditing ? 'Editar Evolução do Paciente' : 'Evolução do Paciente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Paciente */}
          <div className="space-y-2">
            <Label htmlFor="paciente" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Paciente
            </Label>
            <Input
              id="paciente"
              type="text"
              value={pacienteNome}
              disabled={true}
              className="bg-gray-50 cursor-not-allowed"
              placeholder="Nome do paciente"
            />
          </div>

          {/* Profissional */}
          <div className="space-y-2">
            <Label htmlFor="profissional" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Profissional
            </Label>
            <Input
              id="profissional"
              type="text"
              value={profissionalNome}
              disabled={true}
              className="bg-gray-50 cursor-not-allowed"
              placeholder="Nome do profissional"
            />
          </div>

          {/* Data da Evolução */}
          <div className="space-y-2">
            <Label htmlFor="dataEvolucao" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data da Evolução *
            </Label>
            <Input
              id="dataEvolucao"
              type="date"
              value={form.dataEvolucao}
              onChange={(e) => {
                setForm({ ...form, dataEvolucao: e.target.value });
                setFormError('');
              }}
              disabled={formLoading}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Objetivo da Sessão */}
          <div className="space-y-2">
            <Label htmlFor="objetivoSessao" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Objetivo da Sessão *
            </Label>
            <Input
              id="objetivoSessao"
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

          {/* Descrição da Evolução */}
          <div className="space-y-2">
            <Label htmlFor="descricaoEvolucao" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Descrição da Evolução *
            </Label>
            <Textarea
              id="descricaoEvolucao"
              placeholder="Descreva detalhadamente a evolução do paciente, procedimentos realizados, observações importantes..."
              value={form.descricaoEvolucao}
              onChange={(e) => {
                setForm({ ...form, descricaoEvolucao: e.target.value });
                setFormError('');
              }}
              disabled={formLoading}
              rows={4}
              className="resize-none"
            />
            <div className="text-xs text-gray-500">
              {form.descricaoEvolucao?.length || 0} caracteres
            </div>
          </div>

          {formError && <FormErrorMessage>{formError}</FormErrorMessage>}

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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}