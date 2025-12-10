import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eye, ChevronDown, ChevronUp, Search } from 'lucide-react';
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
import { formatarApenasData, formatarDataHoraLocal } from '@/utils/dateUtils';
import { ConfirmPasswordModal } from '@/components/ConfirmPasswordModal';
import { getHistoricoFinanceiroProfissional, HistoricoFinanceiroProfissional, ContaPagarHistorico } from '@/services/historico-financeiro';
import { toast } from 'sonner';

export const HistoricoPage = () => {
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [historicoData, setHistoricoData] = useState<HistoricoFinanceiroProfissional | null>(null);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [expandedContas, setExpandedContas] = useState<Set<string>>(new Set());

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

  // Toggle expansão de agendamentos
  const toggleExpanded = (contaId: string) => {
    setExpandedContas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contaId)) {
        newSet.delete(contaId);
      } else {
        newSet.add(contaId);
      }
      return newSet;
    });
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
        <div className="flex flex-col">
          <span className="text-sm font-medium">{item.descricao}</span>
          {item.empresaNome && (
            <span className="text-xs text-gray-500">{item.empresaNome}</span>
          )}
          {item.categoriaNome && (
            <span className="text-xs text-gray-500">{item.categoriaNome}</span>
          )}
        </div>
      )
    },
    {
      key: 'valores',
      header: '💰 Valores',
      essential: true,
      render: (item) => (
        <div className="flex flex-col gap-1">
          <div className="text-xs text-gray-500">
            Original: <ValorDisplay valor={item.valorOriginal} tipo="negativo" className="text-xs" />
          </div>
          <div className="text-xs text-gray-500">
            Líquido: <ValorDisplay valor={item.valorLiquido} tipo="negativo" className="text-xs font-semibold" />
          </div>
          {item.valorPago > 0 && (
            <div className="text-xs text-green-600">
              Pago: <ValorDisplay valor={item.valorPago} tipo="negativo" className="text-xs" />
            </div>
          )}
        </div>
      )
    },
    {
      key: 'datas',
      header: '📅 Datas',
      essential: true,
      render: (item) => (
        <div className="flex flex-col gap-1 text-xs">
          <div>Emissão: {formatarApenasData(item.dataEmissao)}</div>
          <div>Vencimento: {formatarApenasData(item.dataVencimento)}</div>
          {item.dataPagamento && (
            <div className="text-green-600">Pagamento: {formatarApenasData(item.dataPagamento)}</div>
          )}
        </div>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleExpanded(item.id)}
          className="flex items-center gap-1 text-xs"
        >
          {item.agendamentos.length} {item.agendamentos.length === 1 ? 'agendamento' : 'agendamentos'}
          {expandedContas.has(item.id) ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </Button>
      )
    }
  ];

  // Renderizar lista de agendamentos expandida
  const renderAgendamentos = (conta: ContaPagarHistorico) => {
    if (!expandedContas.has(conta.id) || conta.agendamentos.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">
          Agendamentos Vinculados ({conta.agendamentos.length})
        </h4>
        <div className="space-y-2">
          {conta.agendamentos.map((ag) => (
            <div key={ag.id} className="p-2 bg-white rounded border border-gray-200 text-xs">
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{ag.pacienteNome || 'Paciente não informado'}</div>
                  <div className="text-gray-500">{ag.pacienteCpf || 'CPF não informado'}</div>
                </div>
                <Badge className={`text-xs ${
                  ag.status === 'FINALIZADO' ? 'bg-green-100 text-green-800' :
                  ag.status === 'AGENDADO' ? 'bg-blue-100 text-blue-800' :
                  ag.status === 'CANCELADO' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {ag.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600">
                <div>📅 {(() => {
                  const { data, hora } = formatarDataHoraLocal(ag.dataHoraInicio);
                  return `${data} ${hora}`;
                })()}</div>
                <div>🏥 {ag.servicoNome || 'Serviço não informado'}</div>
                <div>🏢 {ag.convenioNome || 'Convênio não informado'}</div>
                <div>📍 {ag.recursoNome || 'Recurso não informado'}</div>
                {ag.numeroSessao && <div>🔢 Sessão: {ag.numeroSessao}</div>}
                {ag.tipoAtendimento && <div>📝 Tipo: {ag.tipoAtendimento}</div>}
              </div>
              {ag.observacoes && (
                <div className="mt-1 pt-1 border-t border-gray-100 text-gray-500">
                  💬 {ag.observacoes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

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
          onClick={() => toggleExpanded(item.id)}
          className="w-full flex items-center justify-center gap-2 text-xs"
        >
          📋 {item.agendamentos.length} {item.agendamentos.length === 1 ? 'agendamento' : 'agendamentos'}
          {expandedContas.has(item.id) ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </Button>

        {renderAgendamentos(item)}

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
        {viewMode === 'table' ? (
          <div className="space-y-2">
            <ResponsiveTable
              data={contasPaginadas}
              columns={columns}
              emptyMessage="Nenhum registro encontrado no histórico"
              module="financeiro"
            />
            {contasPaginadas.map((conta) => (
              <div key={`expanded-${conta.id}`}>
                {renderAgendamentos(conta)}
              </div>
            ))}
          </div>
        ) : (
          <ResponsiveCards
            data={contasPaginadas}
            renderCard={renderCard}
            emptyMessage="Nenhum registro encontrado no histórico"
            gridCols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          />
        )}

        {contasFiltradas.length > 0 && (
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
        )}
      </PageContent>
    </PageContainer>
  );
};
