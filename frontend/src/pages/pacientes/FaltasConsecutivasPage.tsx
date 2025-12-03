import { useEffect, useState } from 'react';
import { AlertTriangle, Eye, Phone, MessageCircle, Calendar, Clock, User, Users, FileText } from 'lucide-react';
import { getPacientesComFaltasConsecutivas, PacienteComFaltas, FaltaData } from '../../services/faltas-consecutivas';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useNavigate } from 'react-router-dom';

export default function FaltasConsecutivasPage() {
  const navigate = useNavigate();
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

  const handleVerAgendamentos = (pacienteId: string) => {
    navigate(`/agendamentos?pacienteId=${pacienteId}`);
  };

  const handleVerHistoricoFaltas = (paciente: PacienteComFaltas) => {
    setSelectedPaciente(paciente);
    setModalOpen(true);
  };

  const handleWhatsApp = (whatsapp: string) => {
    if (!whatsapp) return;

    // Remove caracteres não numéricos
    const numeroLimpo = whatsapp.replace(/\D/g, '');

    // Abre WhatsApp
    window.open(`https://wa.me/${numeroLimpo}`, '_blank');
  };

  const formatarDataHora = (dataISO: string) => {
    if (!dataISO) return { data: '', hora: '' };

    const date = new Date(dataISO);
    const dia = date.getDate().toString().padStart(2, '0');
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const ano = date.getFullYear().toString();
    const hora = date.getHours().toString().padStart(2, '0');
    const minuto = date.getMinutes().toString().padStart(2, '0');

    return {
      data: `${dia}/${mes}/${ano}`,
      hora: `${hora}:${minuto}`
    };
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
                    <TableHead>Convênio</TableHead>
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
                      <TableCell>{paciente.convenioNome}</TableCell>
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
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerHistoricoFaltas(paciente)}
                            className="gap-1 bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {paciente.pacienteWhatsapp && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleWhatsApp(paciente.pacienteWhatsapp)}
                              className="gap-1 bg-green-50 hover:bg-green-100 text-green-600 border-green-200"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
          {/* Header fixo */}
          <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-200">
            <DialogHeader>
              <div className="flex items-center justify-between gap-4">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Histórico de Faltas - {selectedPaciente?.pacienteNome}
                </DialogTitle>
              </div>
            </DialogHeader>

            {/* Resumo */}
            <div className="mt-4 bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-900">
                    Total de faltas: {selectedPaciente?.totalFaltas}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">
                    Faltas consecutivas: {selectedPaciente?.faltasConsecutivas}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo scrollável */}
          <div className="flex-1 overflow-y-auto px-6">
            {/* Lista de Faltas em formato de tabela */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableHead className="py-2 text-xs font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Data
                      </div>
                    </TableHead>
                    <TableHead className="py-2 text-xs font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Hora
                      </div>
                    </TableHead>
                    <TableHead className="py-2 text-xs font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Profissional
                      </div>
                    </TableHead>
                    <TableHead className="py-2 text-xs font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Serviço
                      </div>
                    </TableHead>
                    <TableHead className="py-2 text-xs font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Convênio
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPaciente?.faltas.map((falta: FaltaData) => {
                    const { data, hora } = formatarDataHora(falta.dataHoraInicio);

                    return (
                      <TableRow
                        key={falta.agendamentoId}
                        className="hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all duration-200"
                      >
                        <TableCell className="py-1.5">
                          <span className="text-xs font-medium">{data}</span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className="text-xs text-gray-600">{hora}</span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className="text-xs">{falta.profissionalNome}</span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className="text-xs">{falta.servicoNome}</span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className="text-xs">{falta.convenioNome}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer com padding */}
          <div className="p-4"></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
