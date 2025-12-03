import { useEffect, useState } from 'react';
import { AlertTriangle, Eye, Phone } from 'lucide-react';
import { getPacientesComFaltasConsecutivas, PacienteComFaltas, FaltaData } from '../../services/faltas-consecutivas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';

export default function FaltasConsecutivasPage() {
  const [pacientes, setPacientes] = useState<PacienteComFaltas[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteComFaltas | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    carregarPacientes();
  }, []);

  const carregarPacientes = async () => {
    try {
      setLoading(true);
      const data = await getPacientesComFaltasConsecutivas();
      setPacientes(data);
    } catch (error) {
      console.error('Erro ao carregar pacientes com faltas consecutivas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerAgendamentos = (paciente: PacienteComFaltas) => {
    setSelectedPaciente(paciente);
    setModalOpen(true);
  };

  const formatarData = (data: string) => {
    return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <div>
          <h1 className="text-3xl font-bold">Pacientes com Faltas Consecutivas</h1>
          <p className="text-muted-foreground">Monitoramento de pacientes com 2 ou mais faltas seguidas</p>
        </div>
      </div>

      {/* Banner de Alerta */}
      {pacientes.length > 0 && (
        <Card className="border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-orange-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alerta de Faltas Consecutivas
            </CardTitle>
            <CardDescription>
              {pacientes.length} {pacientes.length === 1 ? 'paciente apresenta' : 'pacientes apresentam'} padrão de faltas consecutivas
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Tabela */}
      {pacientes.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-lg font-medium">Nenhum paciente com faltas consecutivas</p>
              <p className="text-sm text-muted-foreground">
                Não há pacientes com 2 ou mais faltas seguidas no momento
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Convênio</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-center">Faltas Consecutivas</TableHead>
                    <TableHead className="text-center">Total Faltas</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pacientes.map((paciente) => (
                    <TableRow key={paciente.pacienteId}>
                      <TableCell className="font-medium">{paciente.pacienteNome}</TableCell>
                      <TableCell>
                        {paciente.pacienteWhatsapp ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{paciente.pacienteWhatsapp}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>{paciente.profissionalNome}</TableCell>
                      <TableCell>{paciente.convenioNome}</TableCell>
                      <TableCell>{paciente.servicoNome}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="destructive"
                          className="bg-red-500"
                        >
                          {paciente.faltasConsecutivas}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className="bg-orange-100 text-orange-800"
                        >
                          {paciente.totalFaltas}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerAgendamentos(paciente)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Ver Agendamentos
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Histórico de Faltas */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Histórico de Faltas - {selectedPaciente?.pacienteNome}
            </DialogTitle>
            <DialogDescription>
              Lista completa de agendamentos não comparecidos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {selectedPaciente?.faltas.map((falta: FaltaData, index: number) => (
              <Card key={falta.agendamentoId} className="border-l-4 border-l-red-400">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Falta #{index + 1}</span>
                    <Badge variant="destructive" className="bg-red-500">
                      {formatarData(falta.dataHoraInicio)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Profissional:</span>
                      <p className="font-medium">{falta.profissionalNome}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Serviço:</span>
                      <p className="font-medium">{falta.servicoNome}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Convênio:</span>
                      <p className="font-medium">{falta.convenioNome}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedPaciente && (
            <div className="mt-6 pt-4 border-t">
              <div className="flex gap-4 justify-center">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Faltas Consecutivas</p>
                  <Badge variant="destructive" className="mt-1 bg-red-500 text-lg px-4 py-1">
                    {selectedPaciente.faltasConsecutivas}
                  </Badge>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total de Faltas</p>
                  <Badge variant="secondary" className="mt-1 bg-orange-100 text-orange-800 text-lg px-4 py-1">
                    {selectedPaciente.totalFaltas}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
