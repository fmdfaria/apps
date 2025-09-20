import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Stethoscope,
  CreditCard
} from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import ContaPagarModal from '@/pages/financeiro/ContaPagarModal';

interface FechamentoPagamentoModalProps {
  isOpen: boolean;
  agendamentos: Agendamento[];
  profissionalNome: string;
  profissionalId: string;
  valorTotal: number;
  onClose: () => void;
  onConfirmFechamento: (agendamentos: Agendamento[], contaPagarData: any) => Promise<void>;
  calcularValor?: (agendamento: Agendamento) => number;
}

export const FechamentoPagamentoModal: React.FC<FechamentoPagamentoModalProps> = ({
  isOpen,
  agendamentos,
  profissionalNome,
  profissionalId,
  valorTotal,
  onClose,
  onConfirmFechamento,
  calcularValor
}) => {
  const [loading, setLoading] = useState(false);
  const [showContaPagarModal, setShowContaPagarModal] = useState(false);

  const formatarDataHora = (dataISO: string) => {
    if (!dataISO) return { data: '', hora: '' };
    
    const date = new Date(dataISO);
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

  const calcularValorTotalLocal = () => {
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

  const obterPeriodo = () => {
    if (agendamentos.length === 0) return { inicio: '', fim: '' };
    
    const datas = agendamentos
      .map(a => a.dataHoraInicio)
      .filter(d => d)
      .sort();
    
    if (datas.length === 0) return { inicio: '', fim: '' };
    
    const inicio = formatarDataHora(datas[0]).data;
    const fim = formatarDataHora(datas[datas.length - 1]).data;
    
    return { inicio, fim };
  };

  const handleEfetuarFechamento = () => {
    const periodo = obterPeriodo();
    setShowContaPagarModal(true);
  };

  const handleContaPagarSave = async (contaPagarData: any) => {
    setLoading(true);
    try {
      await onConfirmFechamento(agendamentos, contaPagarData);
      setShowContaPagarModal(false);
      onClose();
    } catch (error) {
      console.error('Erro ao efetuar fechamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const periodo = obterPeriodo();

  // Dados pré-preenchidos para o modal da conta a pagar
  const contaPagarInicial = {
    descricao: `Pagamento ${profissionalNome} - Período ${periodo.inicio} a ${periodo.fim}`,
    valorOriginal: valorTotal.toString(),
    profissionalId: profissionalId,
    tipoConta: 'DESPESA' as const,
    dataEmissao: new Date().toISOString().split('T')[0],
    dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 dias a partir de hoje
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
          {/* Header fixo */}
          <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <CreditCard className="w-5 h-5" />
                Fechamento de Pagamento - {profissionalNome}
              </DialogTitle>
            </DialogHeader>

            {/* Resumo */}
            <div className="mt-4 bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">
                    Total de atendimentos: {agendamentos.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-900">
                    Valor total a pagar: {formatarValor(valorTotal)}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs text-orange-700">
                ⚠️ Esta ação criará uma conta a pagar e alterará o status dos agendamentos para ARQUIVADO
              </div>
            </div>
          </div>

          {/* Conteúdo scrollável */}
          <div className="flex-1 overflow-y-auto px-6">
            {/* Lista de Agendamentos */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
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
                        <FileText className="w-4 h-4" />
                        Serviço
                      </div>
                    </TableHead>
                    <TableHead className="py-2 text-xs font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Valor a Pagar
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
                          className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all duration-200"
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
                              {agendamento.servicoNome || 'Não informado'}
                            </span>
                          </TableCell>
                          
                          <TableCell className="py-1.5">
                            <span className="text-xs font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
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
          </div>

          {/* Footer fixo */}
          <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200">
            {/* Rodapé com informações adicionais */}
            {agendamentos.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-600">
                      Período: {periodo.inicio} - {periodo.fim}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="text-gray-600">
                      Total: {agendamentos.length} atendimento(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-red-600" />
                    <span className="text-gray-600">
                      Valor: {formatarValor(valorTotal)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEfetuarFechamento}
                disabled={loading || agendamentos.length === 0}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800"
              >
                {loading ? 'Processando...' : 'Efetuar Fechamento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para criar conta a pagar */}
      <ContaPagarModal
        isOpen={showContaPagarModal}
        conta={contaPagarInicial as any}
        onClose={() => setShowContaPagarModal(false)}
        onSave={handleContaPagarSave}
      />
    </>
  );
};