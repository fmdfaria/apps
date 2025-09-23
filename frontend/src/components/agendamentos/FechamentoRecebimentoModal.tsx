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
  Building,
  TrendingUp
} from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import ContaReceberModal from '@/pages/financeiro/ContaReceberModal';

interface FechamentoRecebimentoModalProps {
  isOpen: boolean;
  agendamentos: Agendamento[];
  convenioNome: string;
  convenioId?: string;
  valorTotal: number;
  onClose: () => void;
  onConfirmFechamento: (agendamentos: Agendamento[], contaReceberData: any) => Promise<void>;
  calcularValor?: (agendamento: Agendamento) => number;
}

export const FechamentoRecebimentoModal: React.FC<FechamentoRecebimentoModalProps> = ({
  isOpen,
  agendamentos,
  convenioNome,
  convenioId,
  valorTotal,
  onClose,
  onConfirmFechamento,
  calcularValor
}) => {
  const [loading, setLoading] = useState(false);
  const [showContaReceberModal, setShowContaReceberModal] = useState(false);

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
    setShowContaReceberModal(true);
  };

  const handleContaReceberSave = async (contaReceberData: any) => {
    setLoading(true);
    try {
      await onConfirmFechamento(agendamentos, contaReceberData);
      setShowContaReceberModal(false);
      onClose();
    } catch (error) {
      console.error('Erro ao efetuar fechamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const periodo = obterPeriodo();

  // Dados pré-preenchidos para o modal da conta a receber
  const contaReceberInicial = {
    descricao: `Recebimento ${convenioNome} - Período ${periodo.inicio} a ${periodo.fim}`,
    valorOriginal: valorTotal.toString(),
    convenioId: convenioId,
    tipoConta: 'RECEITA' as const,
    dataEmissao: new Date().toISOString().split('T')[0],
    dataVencimento: '', // Campo vazio - obrigatório o usuário preencher
    _formaRecebimento: 'TRANSFERENCIA', // Pré-preenchido como Transferência Bancária
    // Pré-preenchimentos dos novos campos
    _empresaNome: 'TIME CONSULTORIA', // Nome da empresa para buscar
    _contaBancariaNome: 'Banco Bradesco da Time', // Nome da conta bancária para buscar
    _categoriaNome: 'RECEITA SERVIÇOS' // Nome da categoria para buscar
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
          {/* Header fixo */}
          <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="w-5 h-5" />
                Fechamento de Recebimento - {convenioNome}
              </DialogTitle>
            </DialogHeader>

            {/* Resumo */}
            <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    Total de atendimentos: {agendamentos.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-900">
                    Valor total a receber: {formatarValor(valorTotal)}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs text-green-700">
                ⚠️ Esta ação criará uma conta a receber e alterará o status dos agendamentos para ARQUIVADO
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
                        <Stethoscope className="w-4 h-4" />
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
                        Valor a Receber
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
                      <TableCell colSpan={6} className="py-12 text-center">
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
                          className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
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
                              <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {(agendamento.pacienteNome || 'P').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-medium">
                                {agendamento.pacienteNome || 'Não informado'}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {(agendamento.profissionalNome || 'P').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-medium">
                                {agendamento.profissionalNome || 'Não informado'}
                              </span>
                            </div>
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
                    <DollarSign className="w-4 h-4 text-green-600" />
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
                className="bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800"
              >
                {loading ? 'Processando...' : 'Efetuar Fechamento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para criar conta a receber */}
      <ContaReceberModal
        isOpen={showContaReceberModal}
        conta={contaReceberInicial as any}
        onClose={() => setShowContaReceberModal(false)}
        onSave={handleContaReceberSave}
      />
    </>
  );
};