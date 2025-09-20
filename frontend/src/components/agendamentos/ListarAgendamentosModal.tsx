import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  Calendar,
  Clock,
  User,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Stethoscope
} from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';

interface ListarAgendamentosModalProps {
  isOpen: boolean;
  agendamentos: Agendamento[];
  titulo: string;
  onClose: () => void;
  calcularValor?: (agendamento: Agendamento) => number; // Função opcional para calcular valor
}

export const ListarAgendamentosModal: React.FC<ListarAgendamentosModalProps> = ({
  isOpen,
  agendamentos,
  titulo,
  onClose,
  calcularValor
}) => {
  const formatarDataHora = (dataISO: string) => {
    if (!dataISO) return { data: '', hora: '' };
    
    // Criar Date object e ajustar para timezone do Brasil (-3 horas)
    const date = new Date(dataISO);
    // Como o banco já está em -0300 mas a API retorna em UTC, precisamos ajustar
    const brasilDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
    
    const dia = brasilDate.getUTCDate().toString().padStart(2, '0');
    const mes = (brasilDate.getUTCMonth() + 1).toString().padStart(2, '0');
    const ano = brasilDate.getUTCFullYear().toString();
    const hora = brasilDate.getUTCHours().toString().padStart(2, '0');
    const minuto = brasilDate.getUTCMinutes().toString().padStart(2, '0');
    
    return {
      data: `${dia}/${mes}/${ano}`,
      hora: `${hora}:${minuto}`
    };
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const calcularValorTotal = () => {
    return agendamentos.reduce((total, agendamento) => {
      if (calcularValor) {
        return total + calcularValor(agendamento);
      } else {
        const preco = parseFloat((agendamento as any).servico?.preco || '0');
        return total + preco;
      }
    }, 0);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AGENDADO':
        return <Calendar className="w-4 h-4" />;
      case 'SOLICITADO':
        return <AlertCircle className="w-4 h-4" />;
      case 'LIBERADO':
        return <CheckCircle className="w-4 h-4" />;
      case 'ATENDIDO':
        return <Stethoscope className="w-4 h-4" />;
      case 'FINALIZADO':
        return <CheckCircle className="w-4 h-4" />;
      case 'CANCELADO':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AGENDADO':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'SOLICITADO':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'LIBERADO':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'ATENDIDO':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'FINALIZADO':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CANCELADO':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5" />
            {titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Total de atendimentos: {agendamentos.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">
                  Valor total: {formatarValor(calcularValorTotal())}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Lista de Agendamentos */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <TableHead className="py-2 text-xs font-semibold text-gray-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data/Hora
                    </div>
                  </TableHead>
                  <TableHead className="py-2 text-xs font-semibold text-gray-700">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Paciente
                    </div>
                  </TableHead>
                  <TableHead className="py-2 text-xs font-semibold text-gray-700">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
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
                      <DollarSign className="w-4 h-4" />
                      {calcularValor ? 'Valor a Pagar' : 'Preço'}
                    </div>
                  </TableHead>
                  <TableHead className="py-2 text-xs font-semibold text-gray-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Status
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agendamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">
                          Nenhum atendimento encontrado
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  agendamentos.map((agendamento) => {
                    const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
                    
                    return (
                      <TableRow 
                        key={agendamento.id} 
                        className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200"
                      >
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-1">
                            <div className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                              {data}
                            </div>
                            <div className="text-xs font-mono bg-blue-100 px-1.5 py-0.5 rounded text-blue-700">
                              {hora}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {(agendamento.pacienteNome || 'P').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium">
                              {agendamento.pacienteNome || 'Não informado'}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-1.5">
                          <span className="text-xs">
                            {agendamento.profissionalNome || 'Não informado'}
                          </span>
                        </TableCell>
                        
                        <TableCell className="py-1.5">
                          <span className="text-xs">
                            {agendamento.servicoNome || 'Não informado'}
                          </span>
                        </TableCell>
                        
                        <TableCell className="py-1.5">
                          <span className="text-xs font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                            {calcularValor 
                              ? formatarValor(calcularValor(agendamento))
                              : formatarValor(parseFloat((agendamento as any).servico?.preco || '0'))
                            }
                          </span>
                        </TableCell>
                        
                        <TableCell className="py-1.5">
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] flex items-center gap-1 w-fit px-1.5 py-0.5 ${getStatusColor(agendamento.status)}`}
                          >
                            {getStatusIcon(agendamento.status)}
                            {agendamento.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Rodapé com informações adicionais */}
          {agendamentos.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">
                    Período: {formatarDataHora(agendamentos[0].dataHoraInicio).data} - {formatarDataHora(agendamentos[agendamentos.length - 1].dataHoraInicio).data}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-600">
                    Total: {agendamentos.length} atendimento(s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">
                    Status: Todos finalizados
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};