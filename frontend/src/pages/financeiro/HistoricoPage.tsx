import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eye, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  PageContainer,
  PageHeader,
  PageContent,
  ViewToggle,
  ResponsiveTable,
  ResponsiveCards,
  ResponsivePagination,
  ActionButton,
  TableColumn
} from '@/components/layout';
import { useViewMode } from '@/hooks/useViewMode';
import { ValorDisplay } from '@/components/financeiro';
import { formatarApenasData } from '@/utils/dateUtils';
import { ConfirmPasswordModal } from '@/components/ConfirmPasswordModal';
import { getHistoricoFinanceiroProfissional, HistoricoFinanceiroProfissional, ContaPagarHistorico, AgendamentoHistorico } from '@/services/historico-financeiro';
import { toast } from 'sonner';
import { ListarAgendamentosModal } from '@/components/agendamentos/ListarAgendamentosModal';
import type { Agendamento } from '@/types/agendamento';

export const HistoricoPage = () => {
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [historicoData, setHistoricoData] = useState<HistoricoFinanceiroProfissional | null>(null);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  // Estados para modal de agendamentos
  const [showAgendamentosModal, setShowAgendamentosModal] = useState(false);
  const [agendamentosVinculados, setAgendamentosVinculados] = useState<Agendamento[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState<ContaPagarHistorico | null>(null);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({
    defaultMode: 'table',
    persistMode: true,
    localStorageKey: 'historico-view'
  });

  // Efeito para sempre pedir senha ao entrar
  useEffect(() => {
    setShowPasswordModal(true);
    setAuthenticated(false);
    setHistoricoData(null);
  }, []);

  // Limpar dados ao sair da página
  useEffect(() => {
    return () => {
      setAuthenticated(false);
      setHistoricoData(null);
    };
  }, []);

  // Função após confirmar senha
  const handlePasswordConfirmed = async () => {
    setShowPasswordModal(false);
    setAuthenticated(true);
    setLoading(true);

    try {
      const data = await getHistoricoFinanceiroProfissional();
      setHistoricoData(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico', {
        description: 'Não foi possível carregar seu histórico financeiro.'
      });
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  // Função ao cancelar senha
  const handlePasswordCanceled = () => {
    setShowPasswordModal(false);
    navigate('/home');
  };

  // Função para calcular valor do profissional (igual à PagamentosPage)
  const calcularValorProfissional = (agendamento: Agendamento): number => {
    // Prioridade: valor_profissional direto do serviço
    const valorProfissionalDireto = parseFloat((agendamento as any).servico?.valorProfissional || '0');
    if (valorProfissionalDireto > 0) {
      return valorProfissionalDireto;
    }

    // Fallback para valor padrão
    return 0;
  };

  // Função para abrir modal de agendamentos
  const handleVerAgendamentos = (conta: ContaPagarHistorico) => {
    // Converter AgendamentoHistorico para Agendamento
    const agendamentosConvertidos: Agendamento[] = conta.agendamentos.map(ag => ({
      id: ag.id,
      dataHoraInicio: ag.dataHoraInicio,
      dataHoraFim: ag.dataHoraFim || undefined,
      status: ag.status as any,
      tipoAtendimento: ag.tipoAtendimento as any,
      numeroSessao: ag.numeroSessao || undefined,
      observacoes: ag.observacoes || undefined,
      // Campos diretos que o modal espera
      pacienteNome: ag.pacienteNome || undefined,
      profissionalNome: historicoData?.profissional.nome || undefined,
      servicoNome: ag.servicoNome || undefined,
      convenioNome: ag.convenioNome || undefined,
      recursoNome: ag.recursoNome || undefined,
      // Objeto servico com preco e valorProfissional (para o modal calcular o valor correto)
      servico: {
        id: ag.servicoId,
        nome: ag.servicoNome || '',
        preco: ag.servicoPreco || 0,
        valorProfissional: ag.servicoValorProfissional || 0
      } as any,
      // Campos obrigatórios do tipo Agendamento (IDs reais)
      pacienteId: '',
      profissionalId: ag.profissionalId,
      recursoId: '',
      convenioId: '',
      servicoId: ag.servicoId,
      criadoEm: ag.dataHoraInicio,
      atualizadoEm: ag.dataHoraInicio,
    }));

    setContaSelecionada(conta);
    setAgendamentosVinculados(agendamentosConvertidos);
    setShowAgendamentosModal(true);
  };

  // Filtrar histórico pela busca
  const contasFiltradas = historicoData?.contas.filter(conta => {
    if (!busca) return true;
    const buscaLower = busca.toLowerCase();
    return (
      conta.descricao.toLowerCase().includes(buscaLower) ||
      conta.valorOriginal.toString().includes(buscaLower) ||
      conta.status.toLowerCase().includes(buscaLower) ||
      conta.empresaNome?.toLowerCase().includes(buscaLower) ||
      conta.categoriaNome?.toLowerCase().includes(buscaLower) ||
      conta.agendamentos.some(ag =>
        ag.pacienteNome?.toLowerCase().includes(buscaLower) ||
        ag.servicoNome?.toLowerCase().includes(buscaLower)
      )
    );
  }) || [];

  // Paginação
  const totalPaginas = Math.ceil(contasFiltradas.length / itensPorPagina);
  const contasPaginadas = contasFiltradas.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  // Configuração das colunas da tabela
  const columns: TableColumn<ContaPagarHistorico>[] = [
    {
      key: 'descricao',
      header: '📄 Descrição',
      essential: true,
      render: (item) => (
        <span className="text-sm font-medium">{item.descricao}</span>
      )
    },
    {
      key: 'numeroDocumento',
      header: '📋 Núm. Doc',
      essential: false,
      render: (item) => (
        <span className="text-sm">{item.numeroDocumento || '-'}</span>
      )
    },
    {
      key: 'valorOriginal',
      header: '💰 Valor',
      essential: true,
      render: (item) => (
        <ValorDisplay valor={item.valorOriginal} tipo="negativo" className="text-sm font-semibold" />
      )
    },
    {
      key: 'dataEmissao',
      header: '📅 Dt. Emissão',
      essential: true,
      render: (item) => (
        <span className="text-sm">{formatarApenasData(item.dataEmissao)}</span>
      )
    },
    {
      key: 'dataPagamento',
      header: '📅 Dt. Pagamento',
      essential: true,
      render: (item) => (
        <span className={`text-sm ${item.dataPagamento ? 'text-green-600' : 'text-gray-400'}`}>
          {item.dataPagamento ? formatarApenasData(item.dataPagamento) : '-'}
        </span>
      )
    },
    {
      key: 'status',
      header: '📊 Status',
      essential: true,
      render: (item) => {
        const statusColors: Record<string, string> = {
          PAGO: 'bg-green-100 text-green-800',
          PENDENTE: 'bg-yellow-100 text-yellow-800',
          CANCELADO: 'bg-red-100 text-red-800',
          VENCIDO: 'bg-red-100 text-red-800'
        };
        return (
          <Badge className={`text-xs ${statusColors[item.status] || 'bg-gray-100 text-gray-800'}`}>
            {item.status}
          </Badge>
        );
      }
    },
    {
      key: 'agendamentos',
      header: '📋 Agendamentos',
      essential: true,
      render: (item) => (
        <ActionButton
          variant="view"
          module="financeiro"
          onClick={() => handleVerAgendamentos(item)}
          title="Ver agendamentos vinculados"
          disabled={item.agendamentos.length === 0}
          className="min-w-[80px]"
        >
          <Eye className="w-4 h-4" />
          <span className="ml-1">{item.agendamentos.length}</span>
        </ActionButton>
      )
    }
  ];

  // Renderizar card individual
  const renderCard = (item: ContaPagarHistorico) => {
    const statusColors: Record<string, string> = {
      PAGO: 'bg-green-100 text-green-800',
      PENDENTE: 'bg-yellow-100 text-yellow-800',
      CANCELADO: 'bg-red-100 text-red-800',
      VENCIDO: 'bg-red-100 text-red-800'
    };

    return (
      <div key={item.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.descricao}</h3>
            {item.empresaNome && (
              <div className="text-xs text-gray-600">🏢 {item.empresaNome}</div>
            )}
            {item.categoriaNome && (
              <div className="text-xs text-gray-600">📁 {item.categoriaNome}</div>
            )}
          </div>
          <Badge className={`text-xs ${statusColors[item.status] || 'bg-gray-100 text-gray-800'}`}>
            {item.status}
          </Badge>
        </div>

        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Original:</span>
            <ValorDisplay valor={item.valorOriginal} tipo="negativo" className="text-sm font-semibold" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Líquido:</span>
            <ValorDisplay valor={item.valorLiquido} tipo="negativo" className="text-sm font-bold text-orange-600" />
          </div>
          {item.valorPago > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Pago:</span>
              <ValorDisplay valor={item.valorPago} tipo="negativo" className="text-sm text-green-600" />
            </div>
          )}
        </div>

        <div className="mb-3 pt-2 border-t space-y-1 text-xs text-gray-600">
          <div>📅 Emissão: {formatarApenasData(item.dataEmissao)}</div>
          <div>📅 Vencimento: {formatarApenasData(item.dataVencimento)}</div>
          {item.dataPagamento && (
            <div className="text-green-600">✅ Pagamento: {formatarApenasData(item.dataPagamento)}</div>
          )}
          {item.formaPagamento && (
            <div>💳 Forma: {item.formaPagamento}</div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleVerAgendamentos(item)}
          className="w-full flex items-center justify-center gap-2 text-xs"
          disabled={item.agendamentos.length === 0}
        >
          <Eye className="w-4 h-4" />
          Ver Agendamentos ({item.agendamentos.length})
        </Button>

        {item.observacoes && (
          <div className="mt-3 pt-2 border-t text-xs text-gray-500">
            💬 {item.observacoes}
          </div>
        )}
      </div>
    );
  };

  // Mostrar modal de senha
  if (showPasswordModal) {
    return <ConfirmPasswordModal isOpen={showPasswordModal} onConfirm={handlePasswordConfirmed} onCancel={handlePasswordCanceled} />;
  }

  // Loading após autenticação
  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando histórico financeiro...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Renderizar página
  return (
    <PageContainer>
      <PageHeader
        title="Histórico Financeiro"
        icon="📜"
        module="financeiro"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {historicoData && (
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{historicoData.profissional.nome}</span>
              <span className="mx-2">•</span>
              <span>{historicoData.profissional.cpf}</span>
            </div>
          )}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar no histórico..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>
            <ViewToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              module="financeiro"
            />
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <div className="flex-1 overflow-auto">
          {viewMode === 'table' ? (
            <ResponsiveTable
              data={contasPaginadas}
              columns={columns}
              emptyMessage="Nenhum registro encontrado no histórico"
              module="financeiro"
            />
          ) : (
            <ResponsiveCards
              data={contasPaginadas}
              renderCard={renderCard}
              emptyMessage="Nenhum registro encontrado no histórico"
              gridCols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            />
          )}
        </div>

        {contasFiltradas.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <ResponsivePagination
              currentPage={paginaAtual}
              totalPages={totalPaginas}
              onPageChange={setPaginaAtual}
              itemsPerPage={itensPorPagina}
              onItemsPerPageChange={(value) => {
                setItensPorPagina(value);
                setPaginaAtual(1);
              }}
              totalItems={contasFiltradas.length}
              module="financeiro"
            />
          </div>
        )}
      </PageContent>

      <ListarAgendamentosModal
        isOpen={showAgendamentosModal}
        agendamentos={agendamentosVinculados}
        titulo={`Agendamentos Vinculados - ${contaSelecionada?.descricao || ''}`}
        onClose={() => setShowAgendamentosModal(false)}
        calcularValor={calcularValorProfissional}
      />
    </PageContainer>
  );
};
