import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, User, Stethoscope, CreditCard, FileText, MapPin, Repeat } from 'lucide-react';
import type { CreateAgendamentoData } from '@/services/agendamentos';
import type { TipoAtendimento, TipoRecorrencia } from '@/types/Agendamento';
import type { Paciente } from '@/types/Paciente';
import type { Profissional } from '@/types/Profissional';
import type { Convenio } from '@/types/Convenio';
import type { Servico } from '@/types/Servico';
import type { Recurso } from '@/types/Recurso';
import { createAgendamento } from '@/services/agendamentos';
import { getPacientes } from '@/services/pacientes';
import { getProfissionais } from '@/services/profissionais';
import { getConvenios } from '@/services/convenios';
import { getServicos } from '@/services/servicos';
import { getRecursos } from '@/services/recursos';
import { toast } from 'sonner';

interface NovoAgendamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preenchimentoInicial?: {
    profissionalId?: string;
    dataHoraInicio?: string;
  };
}

export const NovoAgendamentoModal: React.FC<NovoAgendamentoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preenchimentoInicial
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [formData, setFormData] = useState<CreateAgendamentoData>({
    pacienteId: '',
    profissionalId: '',
    tipoAtendimento: 'presencial',
    recursoId: '',
    convenioId: '',
    servicoId: '',
    dataHoraInicio: '',
    recorrencia: undefined
  });
  
  const [temRecorrencia, setTemRecorrencia] = useState(false);
  const [recorrencia, setRecorrencia] = useState({
    tipo: 'semanal' as TipoRecorrencia,
    repeticoes: 4,
    ate: ''
  });

  // Estados para dados reais
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);

  // Função para carregar todos os dados necessários
  const carregarDados = async () => {
    setLoadingData(true);
    try {
      const [
        pacientesData,
        profissionaisData, 
        conveniosData,
        servicosData,
        recursosData
      ] = await Promise.all([
        getPacientes(),
        getProfissionais(),
        getConvenios(),
        getServicos(),
        getRecursos()
      ]);

      // Ordenar dados por nome
      setPacientes(pacientesData.sort((a, b) => 
        a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR', { sensitivity: 'base' })
      ));
      setProfissionais(profissionaisData.sort((a, b) => 
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      ));
      setConvenios(conveniosData.sort((a, b) => 
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      ));
      setServicos(servicosData.sort((a, b) => 
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      ));
      setRecursos(recursosData.sort((a, b) => 
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      ));

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do formulário');
    } finally {
      setLoadingData(false);
    }
  };

  // Effect para carregar dados quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      carregarDados();
    }
  }, [isOpen]);

  // Effect para pré-preenchimento quando o modal abrir
  useEffect(() => {
    if (isOpen && preenchimentoInicial) {
      setFormData(prev => ({
        ...prev,
        profissionalId: preenchimentoInicial.profissionalId || '',
        dataHoraInicio: preenchimentoInicial.dataHoraInicio || ''
      }));
    }
  }, [isOpen, preenchimentoInicial]);

  const resetForm = () => {
    setFormData({
      pacienteId: '',
      profissionalId: '',
      tipoAtendimento: 'presencial',
      recursoId: '',
      convenioId: '',
      servicoId: '',
      dataHoraInicio: '',
      recorrencia: undefined
    });
    setTemRecorrencia(false);
    setRecorrencia({
      tipo: 'semanal',
      repeticoes: 4,
      ate: ''
    });
    
    // Limpar dados carregados para próxima sessão
    setPacientes([]);
    setProfissionais([]);
    setConvenios([]);
    setServicos([]);
    setRecursos([]);
    setLoadingData(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.pacienteId || !formData.profissionalId || !formData.servicoId || 
        !formData.convenioId || !formData.recursoId || !formData.dataHoraInicio) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const dadosParaEnvio = {
        ...formData,
        recorrencia: temRecorrencia ? {
          tipo: recorrencia.tipo,
          ...(recorrencia.repeticoes && { repeticoes: recorrencia.repeticoes }),
          ...(recorrencia.ate && { ate: recorrencia.ate })
        } : undefined
      };

      await createAgendamento(dadosParaEnvio);
      toast.success('Agendamento criado com sucesso!');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast.error('Erro ao criar agendamento');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="w-6 h-6 text-blue-600" />
            Novo Agendamento
            {loadingData && (
              <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Carregando dados...
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção Principal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5" />
                Informações do Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Paciente */}
              <div className="space-y-2">
                <Label htmlFor="paciente">Paciente *</Label>
                <Select 
                  value={formData.pacienteId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, pacienteId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingData ? (
                      <SelectItem value="loading" disabled>
                        Carregando pacientes...
                      </SelectItem>
                    ) : pacientes.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        Nenhum paciente encontrado
                      </SelectItem>
                    ) : (
                      pacientes.map(paciente => (
                        <SelectItem key={paciente.id} value={paciente.id}>
                          {paciente.nomeCompleto}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Profissional */}
              <div className="space-y-2">
                <Label htmlFor="profissional">Profissional *</Label>
                <Select 
                  value={formData.profissionalId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, profissionalId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingData ? (
                      <SelectItem value="loading" disabled>
                        Carregando profissionais...
                      </SelectItem>
                    ) : profissionais.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        Nenhum profissional encontrado
                      </SelectItem>
                    ) : (
                      profissionais.map(profissional => (
                        <SelectItem key={profissional.id} value={profissional.id}>
                          {profissional.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Serviço */}
              <div className="space-y-2">
                <Label htmlFor="servico">Serviço *</Label>
                <Select 
                  value={formData.servicoId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, servicoId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingData ? (
                      <SelectItem value="loading" disabled>
                        Carregando serviços...
                      </SelectItem>
                    ) : servicos.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        Nenhum serviço encontrado
                      </SelectItem>
                    ) : (
                      servicos.map(servico => (
                        <SelectItem key={servico.id} value={servico.id}>
                          {servico.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Convênio */}
              <div className="space-y-2">
                <Label htmlFor="convenio">Convênio *</Label>
                <Select 
                  value={formData.convenioId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, convenioId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o convênio" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingData ? (
                      <SelectItem value="loading" disabled>
                        Carregando convênios...
                      </SelectItem>
                    ) : convenios.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        Nenhum convênio encontrado
                      </SelectItem>
                    ) : (
                      convenios.map(convenio => (
                        <SelectItem key={convenio.id} value={convenio.id}>
                          {convenio.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Recurso */}
              <div className="space-y-2">
                <Label htmlFor="recurso">Recurso *</Label>
                <Select 
                  value={formData.recursoId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, recursoId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o recurso" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingData ? (
                      <SelectItem value="loading" disabled>
                        Carregando recursos...
                      </SelectItem>
                    ) : recursos.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        Nenhum recurso encontrado
                      </SelectItem>
                    ) : (
                      recursos.map(recurso => (
                        <SelectItem key={recurso.id} value={recurso.id}>
                          {recurso.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Atendimento */}
              <div className="space-y-2">
                <Label htmlFor="tipoAtendimento">Tipo de Atendimento *</Label>
                <Select 
                  value={formData.tipoAtendimento} 
                  onValueChange={(value: TipoAtendimento) => setFormData(prev => ({ ...prev, tipoAtendimento: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Seção Data/Hora e Recorrência */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Data e Hora */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5" />
                  Data e Horário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="dataHoraInicio">Data e Hora do Agendamento *</Label>
                  <Input
                    id="dataHoraInicio"
                    type="datetime-local"
                    value={formData.dataHoraInicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataHoraInicio: e.target.value }))}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recorrência */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Repeat className="w-5 h-5" />
                  Recorrência (Opcional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="temRecorrencia"
                    checked={temRecorrencia}
                    onCheckedChange={(checked) => setTemRecorrencia(checked === true)}
                  />
                  <Label htmlFor="temRecorrencia">
                    Criar agendamentos recorrentes
                  </Label>
                </div>

                {temRecorrencia && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipoRecorrencia">Tipo de Recorrência</Label>
                      <Select 
                        value={recorrencia.tipo} 
                        onValueChange={(value: TipoRecorrencia) => setRecorrencia(prev => ({ ...prev, tipo: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="quinzenal">Quinzenal</SelectItem>
                          <SelectItem value="mensal">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="repeticoes">Repetições</Label>
                        <Input
                          id="repeticoes"
                          type="number"
                          min="1"
                          max="52"
                          value={recorrencia.repeticoes}
                          onChange={(e) => setRecorrencia(prev => ({ ...prev, repeticoes: parseInt(e.target.value) }))}
                          placeholder="Ex: 4"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ate">Ou até a data</Label>
                        <Input
                          id="ate"
                          type="date"
                          value={recorrencia.ate}
                          onChange={(e) => setRecorrencia(prev => ({ ...prev, ate: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={loading || loadingData}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loading || loadingData}
            >
              {loading ? 'Criando...' : loadingData ? 'Carregando...' : 'Criar Agendamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 