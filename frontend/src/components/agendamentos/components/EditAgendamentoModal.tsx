import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  User,
  Users,
  FileText,
  CreditCard,
  MapPin,
  AlertTriangle,
  Save,
  X,
  Repeat
} from 'lucide-react';
import { useEditAgendamento } from '../hooks/useEditAgendamento';

interface EditAgendamentoModalProps {
  isOpen: boolean;
  agendamentoId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditAgendamentoModal: React.FC<EditAgendamentoModalProps> = ({
  isOpen,
  agendamentoId,
  onClose,
  onSuccess
}) => {
  const {
    agendamentoOriginal,
    formData,
    dataAgendamento,
    horaAgendamento,
    temRecorrencia,
    recorrencia,
    data,
    loading,
    isAgendamentoFuturo,
    podeEditar,
    setFormData,
    setDataAgendamento,
    setHoraAgendamento,
    setTemRecorrencia,
    setRecorrencia,
    handleSubmit,
    opcoesHorarios,
    servicosConveniosProfissional
  } = useEditAgendamento({
    isOpen,
    agendamentoId,
    onClose,
    onSuccess
  });

  if (!agendamentoOriginal) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!podeEditar) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Não é Possível Editar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Este agendamento não pode ser editado porque:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              {!isAgendamentoFuturo && (
                <li className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-500" />
                  A data já passou
                </li>
              )}
              {(agendamentoOriginal.status === 'CANCELADO' || agendamentoOriginal.status === 'FINALIZADO') && (
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Status: {agendamentoOriginal.status}
                  </Badge>
                </li>
              )}
            </ul>
            <div className="flex justify-end">
              <Button onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            Editar Agendamento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações do agendamento original */}
          <Card className="bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Dados Atuais</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Data/Hora:</span>
                  <p className="font-medium">
                    {new Date(agendamentoOriginal.dataHoraInicio).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(agendamentoOriginal.dataHoraInicio).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Paciente:</span>
                  <p className="font-medium">{agendamentoOriginal.pacienteNome}</p>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <Badge variant="outline" className="text-xs ml-1">
                    {agendamentoOriginal.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulário de edição */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Coluna Esquerda */}
            <div className="space-y-4">
              
              {/* Paciente */}
              <div className="space-y-2">
                <Label htmlFor="paciente" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Paciente
                </Label>
                <Select
                  value={formData.pacienteId}
                  onValueChange={(value) => setFormData({ pacienteId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.pacientes?.map((paciente) => (
                      <SelectItem key={paciente.id} value={paciente.id}>
                        {paciente.nome}
                      </SelectItem>
                    )) || []}
                  </SelectContent>
                </Select>
              </div>

              {/* Profissional */}
              <div className="space-y-2">
                <Label htmlFor="profissional" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Profissional
                </Label>
                <Select
                  value={formData.profissionalId}
                  onValueChange={(value) => setFormData({ profissionalId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.profissionais?.map((profissional) => (
                      <SelectItem key={profissional.id} value={profissional.id}>
                        {profissional.nome}
                      </SelectItem>
                    )) || []}
                  </SelectContent>
                </Select>
              </div>

              {/* Serviço */}
              <div className="space-y-2">
                <Label htmlFor="servico" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Serviço
                </Label>
                <Select
                  value={formData.servicoId}
                  onValueChange={(value) => setFormData({ servicoId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(servicosConveniosProfissional) ? servicosConveniosProfissional.map((item) => (
                      <SelectItem key={item.servico.id} value={item.servico.id}>
                        {item.servico.nome}
                      </SelectItem>
                    )) : []}
                  </SelectContent>
                </Select>
              </div>

              {/* Convênio */}
              <div className="space-y-2">
                <Label htmlFor="convenio" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Convênio
                </Label>
                <Select
                  value={formData.convenioId}
                  onValueChange={(value) => setFormData({ convenioId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o convênio" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(servicosConveniosProfissional) ? servicosConveniosProfissional
                      .filter(item => item.servico.id === formData.servicoId)
                      .flatMap(item => item.convenios)
                      .map((convenio) => (
                        <SelectItem key={convenio.id} value={convenio.id}>
                          {convenio.nome}
                        </SelectItem>
                      )) : []}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-4">
              
              {/* Data */}
              <div className="space-y-2">
                <Label htmlFor="data" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data
                </Label>
                <Input
                  id="data"
                  type="date"
                  value={dataAgendamento}
                  onChange={(e) => setDataAgendamento(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Horário */}
              <div className="space-y-2">
                <Label htmlFor="hora" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Horário
                </Label>
                <Select
                  value={horaAgendamento}
                  onValueChange={setHoraAgendamento}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesHorarios.map((opcao) => (
                      <SelectItem key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Atendimento */}
              <div className="space-y-2">
                <Label>Tipo de Atendimento</Label>
                <Select
                  value={formData.tipoAtendimento}
                  onValueChange={(value: 'presencial' | 'online') => setFormData({ tipoAtendimento: value })}
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

              {/* Recurso */}
              <div className="space-y-2">
                <Label htmlFor="recurso" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Recurso
                </Label>
                <Select
                  value={formData.recursoId}
                  onValueChange={(value) => setFormData({ recursoId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o recurso" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.recursos?.map((recurso) => (
                      <SelectItem key={recurso.id} value={recurso.id}>
                        {recurso.nome}
                      </SelectItem>
                    )) || []}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Recorrência */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="recorrencia"
                  checked={temRecorrencia}
                  onCheckedChange={setTemRecorrencia}
                />
                <Label htmlFor="recorrencia" className="flex items-center gap-2">
                  <Repeat className="w-4 h-4" />
                  Configurar Recorrência
                </Label>
              </div>
            </CardHeader>
            
            {temRecorrencia && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={recorrencia.tipo}
                      onValueChange={(value: 'semanal' | 'quinzenal' | 'mensal') => 
                        setRecorrencia({ tipo: value })
                      }
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
                  
                  <div className="space-y-2">
                    <Label>Repetições</Label>
                    <Input
                      type="number"
                      min="1"
                      max="52"
                      value={recorrencia.repeticoes || ''}
                      onChange={(e) => setRecorrencia({ repeticoes: parseInt(e.target.value) || undefined })}
                      placeholder="Número de repetições"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Até (opcional)</Label>
                    <Input
                      type="date"
                      value={recorrencia.ate || ''}
                      onChange={(e) => setRecorrencia({ ate: e.target.value || undefined })}
                      min={dataAgendamento}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <Separator />

          {/* Botões de ação */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {agendamentoOriginal.recorrencia && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>
                    Este agendamento possui recorrência. A edição pode afetar outros agendamentos da série.
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={loading.submit}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading.submit}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading.submit ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};