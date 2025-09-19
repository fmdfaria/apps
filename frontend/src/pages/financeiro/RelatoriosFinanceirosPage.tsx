import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Calendar, Building2, PieChart, BarChart3, Download, Filter } from 'lucide-react';
import { AppToast } from '@/services/toast';
import { 
  getFluxoCaixa,
  getFluxoCaixaPorEmpresa,
  getFluxoCaixaPorCategoria 
} from '@/services/fluxo-caixa';
import { getContasReceber } from '@/services/contas-receber';
import { getContasPagar } from '@/services/contas-pagar';
import { getEmpresasAtivas } from '@/services/empresas';
import type { FluxoCaixa } from '@/types/FluxoCaixa';
import type { ContaReceber } from '@/types/ContaReceber';
import type { ContaPagar } from '@/types/ContaPagar';
import type { Empresa } from '@/types/Empresa';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { 
  PageContainer, 
  PageHeader, 
  PageContent 
} from '@/components/layout';
import { getModuleTheme } from '@/types/theme';

// Financial components
import { ValorDisplay } from '@/components/financeiro';

export const RelatoriosFinanceirosPage = () => {
  const [movimentos, setMovimentos] = useState<FluxoCaixa[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('todas');
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>('mes-atual');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [movimentosData, contasReceberData, contasPagarData, empresasData] = await Promise.all([
        getFluxoCaixa(),
        getContasReceber(),
        getContasPagar(),
        getEmpresasAtivas()
      ]);
      
      setMovimentos(movimentosData);
      setContasReceber(contasReceberData);
      setContasPagar(contasPagarData);
      setEmpresas(empresasData);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      AppToast.error('Erro ao carregar dados', {
        description: 'Ocorreu um problema ao carregar os dados dos relatórios. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar dados baseado nos filtros selecionados
  const dadosFiltrados = useMemo(() => {
    const agora = new Date();
    let dataInicio: Date;
    let dataFim: Date;

    // Determinar período
    switch (periodoSelecionado) {
      case 'mes-atual':
        dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
        dataFim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
        break;
      case 'mes-anterior':
        dataInicio = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
        dataFim = new Date(agora.getFullYear(), agora.getMonth(), 0);
        break;
      case 'trimestre-atual':
        const trimestreAtual = Math.floor(agora.getMonth() / 3);
        dataInicio = new Date(agora.getFullYear(), trimestreAtual * 3, 1);
        dataFim = new Date(agora.getFullYear(), (trimestreAtual + 1) * 3, 0);
        break;
      case 'ano-atual':
        dataInicio = new Date(agora.getFullYear(), 0, 1);
        dataFim = new Date(agora.getFullYear(), 11, 31);
        break;
      default:
        dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
        dataFim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
    }

    // Filtrar movimentos
    const movimentosFiltrados = movimentos.filter(movimento => {
      const dataMovimento = new Date(movimento.dataMovimento);
      const dentroPeríodo = dataMovimento >= dataInicio && dataMovimento <= dataFim;
      const empresaMatch = empresaSelecionada === 'todas' || movimento.empresaId === empresaSelecionada;
      return dentroPeríodo && empresaMatch;
    });

    // Filtrar contas a receber
    const contasReceberFiltradas = contasReceber.filter(conta => {
      const dataVencimento = new Date(conta.dataVencimento);
      const dentroPeríodo = dataVencimento >= dataInicio && dataVencimento <= dataFim;
      const empresaMatch = empresaSelecionada === 'todas' || conta.empresaId === empresaSelecionada;
      return dentroPeríodo && empresaMatch;
    });

    // Filtrar contas a pagar
    const contasPagarFiltradas = contasPagar.filter(conta => {
      const dataVencimento = new Date(conta.dataVencimento);
      const dentroPeríodo = dataVencimento >= dataInicio && dataVencimento <= dataFim;
      const empresaMatch = empresaSelecionada === 'todas' || conta.empresaId === empresaSelecionada;
      return dentroPeríodo && empresaMatch;
    });

    return {
      movimentos: movimentosFiltrados,
      contasReceber: contasReceberFiltradas,
      contasPagar: contasPagarFiltradas
    };
  }, [movimentos, contasReceber, contasPagar, empresaSelecionada, periodoSelecionado]);

  // Calcular resumo financeiro
  const resumoFinanceiro = useMemo(() => {
    const { movimentos: movimentosFiltrados, contasReceber: receberFiltradas, contasPagar: pagarFiltradas } = dadosFiltrados;
    
    // Fluxo de caixa
    const totalEntradas = movimentosFiltrados
      .filter(m => m.tipo === 'ENTRADA')
      .reduce((acc, m) => acc + m.valor, 0);
    
    const totalSaidas = movimentosFiltrados
      .filter(m => m.tipo === 'SAIDA')
      .reduce((acc, m) => acc + m.valor, 0);
    
    const saldoLiquido = totalEntradas - totalSaidas;
    const pendentesFluxo = movimentosFiltrados.filter(m => !m.conciliado).length;
    
    // Contas a receber
    const totalReceber = receberFiltradas
      .filter(c => c.status !== 'RECEBIDA')
      .reduce((acc, c) => acc + c.valorLiquido, 0);
    
    const recebidasPeriodo = receberFiltradas
      .filter(c => c.status === 'RECEBIDA')
      .reduce((acc, c) => acc + c.valorLiquido, 0);
    
    const vencidasReceber = receberFiltradas
      .filter(c => c.status !== 'RECEBIDA' && new Date(c.dataVencimento) < new Date())
      .length;
    
    // Contas a pagar
    const totalPagar = pagarFiltradas
      .filter(c => c.status !== 'PAGA')
      .reduce((acc, c) => acc + c.valorLiquido, 0);
    
    const pagasPeriodo = pagarFiltradas
      .filter(c => c.status === 'PAGA')
      .reduce((acc, c) => acc + c.valorLiquido, 0);
    
    const vencidasPagar = pagarFiltradas
      .filter(c => c.status !== 'PAGA' && new Date(c.dataVencimento) < new Date())
      .length;

    return {
      fluxoCaixa: {
        totalEntradas,
        totalSaidas,
        saldoLiquido,
        pendentes: pendentesFluxo
      },
      contasReceber: {
        totalReceber,
        recebidasPeriodo,
        vencidas: vencidasReceber
      },
      contasPagar: {
        totalPagar,
        pagasPeriodo,
        vencidas: vencidasPagar
      }
    };
  }, [dadosFiltrados]);

  // Relatório por empresa
  const relatorioPorEmpresa = useMemo(() => {
    if (empresaSelecionada !== 'todas') return [];

    return empresas.map(empresa => {
      const movimentosEmpresa = dadosFiltrados.movimentos.filter(m => m.empresaId === empresa.id);
      const receberEmpresa = dadosFiltrados.contasReceber.filter(c => c.empresaId === empresa.id);
      const pagarEmpresa = dadosFiltrados.contasPagar.filter(c => c.empresaId === empresa.id);

      const entradas = movimentosEmpresa.filter(m => m.tipo === 'ENTRADA').reduce((acc, m) => acc + m.valor, 0);
      const saidas = movimentosEmpresa.filter(m => m.tipo === 'SAIDA').reduce((acc, m) => acc + m.valor, 0);
      const aReceber = receberEmpresa.filter(c => c.status !== 'RECEBIDA').reduce((acc, c) => acc + c.valorLiquido, 0);
      const aPagar = pagarEmpresa.filter(c => c.status !== 'PAGA').reduce((acc, c) => acc + c.valorLiquido, 0);

      return {
        empresa: empresa.nomeFantasia || empresa.razaoSocial,
        entradas,
        saidas,
        saldo: entradas - saidas,
        aReceber,
        aPagar,
        saldoProjetado: (entradas - saidas) + aReceber - aPagar
      };
    });
  }, [empresas, dadosFiltrados, empresaSelecionada]);

  const handleExportarRelatorio = () => {
    AppToast.info('Exportação em desenvolvimento', {
      description: 'A funcionalidade de exportação está sendo implementada.'
    });
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando relatórios financeiros...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <TooltipProvider>
      <PageContainer>
        {/* Header da página */}
        <PageHeader title="Relatórios Financeiros" module="financeiro" icon="📊">
          <div className="flex gap-4">
            <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes-atual">Mês Atual</SelectItem>
                <SelectItem value="mes-anterior">Mês Anterior</SelectItem>
                <SelectItem value="trimestre-atual">Trimestre Atual</SelectItem>
                <SelectItem value="ano-atual">Ano Atual</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={empresaSelecionada} onValueChange={setEmpresaSelecionada}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Empresas</SelectItem>
                {empresas.map(empresa => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.nomeFantasia || empresa.razaoSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline"
              onClick={handleExportarRelatorio}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </PageHeader>

        {/* Conteúdo principal */}
        <PageContent>
          {/* Resumo do Fluxo de Caixa */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Fluxo de Caixa
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Entradas</p>
                      <ValorDisplay valor={resumoFinanceiro.fluxoCaixa.totalEntradas} tipo="positivo" className="text-xl font-bold" />
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Saídas</p>
                      <ValorDisplay valor={resumoFinanceiro.fluxoCaixa.totalSaidas} tipo="negativo" className="text-xl font-bold" />
                    </div>
                    <TrendingDown className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Saldo Líquido</p>
                      <ValorDisplay 
                        valor={resumoFinanceiro.fluxoCaixa.saldoLiquido} 
                        tipo={resumoFinanceiro.fluxoCaixa.saldoLiquido >= 0 ? 'positivo' : 'negativo'} 
                        className="text-xl font-bold" 
                      />
                    </div>
                    <Building2 className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pendentes</p>
                      <p className="text-xl font-bold text-gray-900">{resumoFinanceiro.fluxoCaixa.pendentes}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Resumo Contas a Receber e Pagar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Contas a Receber */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <TrendingUp className="w-5 h-5" />
                  Contas a Receber
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total a Receber:</span>
                  <ValorDisplay valor={resumoFinanceiro.contasReceber.totalReceber} tipo="positivo" className="font-semibold" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Recebidas no Período:</span>
                  <ValorDisplay valor={resumoFinanceiro.contasReceber.recebidasPeriodo} tipo="positivo" className="font-semibold" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Contas Vencidas:</span>
                  <span className={`font-semibold ${resumoFinanceiro.contasReceber.vencidas > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {resumoFinanceiro.contasReceber.vencidas}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Contas a Pagar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <TrendingDown className="w-5 h-5" />
                  Contas a Pagar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total a Pagar:</span>
                  <ValorDisplay valor={resumoFinanceiro.contasPagar.totalPagar} tipo="negativo" className="font-semibold" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pagas no Período:</span>
                  <ValorDisplay valor={resumoFinanceiro.contasPagar.pagasPeriodo} tipo="negativo" className="font-semibold" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Contas Vencidas:</span>
                  <span className={`font-semibold ${resumoFinanceiro.contasPagar.vencidas > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {resumoFinanceiro.contasPagar.vencidas}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Relatório por Empresa */}
          {empresaSelecionada === 'todas' && relatorioPorEmpresa.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Relatório por Empresa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-semibold">Empresa</th>
                        <th className="text-right p-2 font-semibold">Entradas</th>
                        <th className="text-right p-2 font-semibold">Saídas</th>
                        <th className="text-right p-2 font-semibold">Saldo</th>
                        <th className="text-right p-2 font-semibold">A Receber</th>
                        <th className="text-right p-2 font-semibold">A Pagar</th>
                        <th className="text-right p-2 font-semibold">Saldo Projetado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorioPorEmpresa.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{item.empresa}</td>
                          <td className="p-2 text-right">
                            <ValorDisplay valor={item.entradas} tipo="positivo" className="text-sm" />
                          </td>
                          <td className="p-2 text-right">
                            <ValorDisplay valor={item.saidas} tipo="negativo" className="text-sm" />
                          </td>
                          <td className="p-2 text-right">
                            <ValorDisplay 
                              valor={item.saldo} 
                              tipo={item.saldo >= 0 ? 'positivo' : 'negativo'} 
                              className="text-sm font-semibold" 
                            />
                          </td>
                          <td className="p-2 text-right">
                            <ValorDisplay valor={item.aReceber} tipo="positivo" className="text-sm" />
                          </td>
                          <td className="p-2 text-right">
                            <ValorDisplay valor={item.aPagar} tipo="negativo" className="text-sm" />
                          </td>
                          <td className="p-2 text-right">
                            <ValorDisplay 
                              valor={item.saldoProjetado} 
                              tipo={item.saldoProjetado >= 0 ? 'positivo' : 'negativo'} 
                              className="text-sm font-bold" 
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </PageContent>
      </PageContainer>
    </TooltipProvider>
  );
};