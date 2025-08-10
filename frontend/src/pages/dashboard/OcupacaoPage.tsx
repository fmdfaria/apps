import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Activity, 
  Building, 
  UserCheck,
  BarChart3,
  PieChart,
  Stethoscope,
  MapPin,
  AlertCircle,
  RefreshCw,
  Eye
} from 'lucide-react';
import { getDadosOcupacao, type DadosOcupacao, type OcupacaoProfissional, type OcupacaoRecurso } from '@/services/ocupacao';
import { 
  PageContainer, 
  PageHeader, 
  PageContent, 
  ViewToggle, 
  SearchBar, 
  FilterButton,
  DynamicFilterPanel,
  ResponsiveTable, 
  ResponsiveCards, 
  ResponsivePagination,
  ActionButton,
  TableColumn,
  ResponsiveCardFooter 
} from '@/components/layout';
// import { useViewMode } from '@/hooks/useViewMode';
// import { useResponsiveTable } from '@/hooks/useResponsiveTable';
// import { useTableFilters } from '@/hooks/useTableFilters';
import { getModuleTheme } from '@/types/theme';

// Tipo para definir o que está sendo visualizado
type TipoVisualizacao = 'profissionais' | 'recursos';

// Função para obter cores baseadas no percentual de ocupação
function getOcupacaoColor(percentual: number) {
  if (percentual >= 80) return { bg: 'bg-red-100', text: 'text-red-800' };
  if (percentual >= 60) return { bg: 'bg-orange-100', text: 'text-orange-800' };
  if (percentual >= 40) return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
  return { bg: 'bg-green-100', text: 'text-green-800' };
}

// Função para formatar ocupação
function formatarOcupacao(ocupados: number, total: number): string {
  return `${ocupados}/${total}`;
}

export const OcupacaoPage: React.FC = () => {
  const theme = getModuleTheme('default');
  const [dadosOcupacao, setDadosOcupacao] = useState<DadosOcupacao | null>(null);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tipoVisualizacao, setTipoVisualizacao] = useState<TipoVisualizacao>('profissionais');
  const [busca, setBusca] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // State para ordenação
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Configuração das colunas para profissionais
  const profissionaisColumns: TableColumn<OcupacaoProfissional>[] = [
    {
      key: 'nome',
      header: '👨‍⚕️ Profissional',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome do profissional...',
        label: 'Profissional'
      },
      render: (item) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-medium">{item.nome}</span>
        </div>
      )
    },
    {
      key: 'ocupacao',
      header: '📊 Ocupação',
      essential: true,
      className: 'text-center',
      render: (item) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {formatarOcupacao(item.ocupados, item.total)}
          </div>
          <Progress value={item.percentual} className="h-2" />
        </div>
      )
    },
    {
      key: 'percentual',
      header: '📈 Percentual',
      essential: true,
      className: 'text-center',
      filterable: {
        type: 'range',
        label: 'Percentual',
        min: 0,
        max: 100
      },
      render: (item) => {
        const colors = getOcupacaoColor(item.percentual);
        return (
          <Badge className={`${colors.bg} ${colors.text}`}>
            {item.percentual}%
          </Badge>
        );
      }
    },
    {
      key: 'agendamentos',
      header: '📅 Agendamentos',
      essential: false,
      render: (item) => (
        <div className="text-sm space-y-1">
          <div>Hoje: <span className="font-medium">{item.agendamentosHoje}</span></div>
          <div>7 dias: <span className="font-medium">{item.agendamentosProximos7}</span></div>
        </div>
      )
    }
  ];

  // Configuração das colunas para recursos
  const recursosColumns: TableColumn<OcupacaoRecurso>[] = [
    {
      key: 'nome',
      header: '🏢 Recurso',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome do recurso...',
        label: 'Recurso'
      },
      render: (item) => (
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            item.disponivel ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <Building className={`w-4 h-4 ${
              item.disponivel ? 'text-green-600' : 'text-gray-400'
            }`} />
          </div>
          <div>
            <span className="font-medium">{item.nome}</span>
            {!item.disponivel && (
              <span className="ml-2 text-xs text-gray-500">(Inativo)</span>
            )}
            <div className="text-xs text-gray-600">{item.tipo}</div>
          </div>
        </div>
      )
    },
    {
      key: 'ocupacao',
      header: '📊 Ocupação',
      essential: true,
      className: 'text-center',
      render: (item) => (
        <div className="space-y-1">
          <Progress value={item.percentualOcupacao} className="h-2" />
          <div className="text-xs text-gray-600">
            {item.percentualOcupacao}%
          </div>
        </div>
      )
    },
    {
      key: 'percentual',
      header: '📈 Percentual',
      essential: true,
      className: 'text-center',
      filterable: {
        type: 'range',
        label: 'Percentual',
        min: 0,
        max: 100
      },
      render: (item) => {
        const colors = getOcupacaoColor(item.percentualOcupacao);
        return (
          <Badge className={`${colors.bg} ${colors.text}`}>
            {item.percentualOcupacao}%
          </Badge>
        );
      }
    },
    {
      key: 'agendamentos',
      header: '📅 Agendamentos',
      essential: false,
      render: (item) => (
        <div className="text-sm space-y-1">
          <div>Hoje: <span className="font-medium">{item.agendamentosHoje}</span></div>
          <div>7 dias: <span className="font-medium">{item.agendamentosProximos7}</span></div>
        </div>
      )
    }
  ];

  // Dados computados baseados no tipo de visualização
  const dadosAtuais = useMemo(() => {
    if (!dadosOcupacao) return [];
    return tipoVisualizacao === 'profissionais' 
      ? dadosOcupacao.ocupacoesProfissionais 
      : dadosOcupacao.ocupacoesRecursos;
  }, [dadosOcupacao, tipoVisualizacao]);

  const colunasAtuais = useMemo(() => {
    return tipoVisualizacao === 'profissionais' ? profissionaisColumns : recursosColumns;
  }, [tipoVisualizacao]);

  // Filtros baseados na busca
  const dadosFiltrados = useMemo(() => {
    if (!busca.trim()) return dadosAtuais;
    
    const buscaLower = busca.toLowerCase();
    return dadosAtuais.filter((item: any) => 
      item.nome.toLowerCase().includes(buscaLower) ||
      (tipoVisualizacao === 'recursos' && 
       (item as OcupacaoRecurso).tipo.toLowerCase().includes(buscaLower))
    );
  }, [dadosAtuais, busca, tipoVisualizacao]);

  // Paginação simples
  const totalPages = Math.ceil(dadosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = dadosFiltrados.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Dados finais para exibir
  const filteredData = currentItems;
  const visibleColumns = colunasAtuais;

  // Carregar dados ao montar componente
  useEffect(() => {
    carregarDadosOcupacao();
  }, []);

  const carregarDadosOcupacao = async () => {
    try {
      setCarregandoDados(true);
      setErro(null);
      const dados = await getDadosOcupacao();
      setDadosOcupacao(dados);
    } catch (error) {
      console.error('Erro ao carregar dados de ocupação:', error);
      setErro('Erro ao carregar dados de ocupação. Tente novamente.');
    } finally {
      setCarregandoDados(false);
    }
  };

  // Toggle para alternar entre profissionais e recursos
  const toggles = [
    { 
      value: 'profissionais' as TipoVisualizacao, 
      label: 'Profissionais', 
      icon: Stethoscope,
      count: dadosOcupacao?.ocupacoesProfissionais.length || 0
    },
    { 
      value: 'recursos' as TipoVisualizacao, 
      label: 'Recursos', 
      icon: Building,
      count: dadosOcupacao?.ocupacoesRecursos.length || 0
    }
  ];

  // Loading state
  if (carregandoDados) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados de ocupação...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Error state
  if (erro) {
    return (
      <PageContainer>
        <PageHeader
          title="Dashboard de Ocupação"
          module="ocupacao"
        />
        <PageContent>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex">
              <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-red-800">Erro ao Carregar Dados</h3>
                <p className="text-red-700 mt-1">{erro}</p>
                <Button 
                  onClick={carregarDadosOcupacao} 
                  className="mt-4 bg-red-600 hover:bg-red-700"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
              </div>
            </div>
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  // No data state
  if (!dadosOcupacao) {
    return (
      <PageContainer>
        <PageHeader
          title="Dashboard de Ocupação"
          module="ocupacao"
        />
        <PageContent>
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum dado de ocupação disponível</p>
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard de Ocupação"
        module="ocupacao"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Cards de Estatísticas Resumidas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Stethoscope className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-xs text-blue-600 font-medium">Profissionais</p>
                  <p className="text-lg font-bold text-blue-900">
                    {dadosOcupacao.estatisticas.profissionaisAtivos}/{dadosOcupacao.estatisticas.totalProfissionais}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-xs text-green-600 font-medium">Recursos</p>
                  <p className="text-lg font-bold text-green-900">
                    {dadosOcupacao.estatisticas.recursosDisponiveis}/{dadosOcupacao.estatisticas.totalRecursos}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-xs text-purple-600 font-medium">7 dias</p>
                  <p className="text-lg font-bold text-purple-900">
                    {dadosOcupacao.estatisticas.agendamentosProximosSete}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="text-xs text-orange-600 font-medium">Média</p>
                  <p className="text-lg font-bold text-orange-900">
                    {dadosOcupacao.estatisticas.mediaOcupacaoProfissionais}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Atualizar */}
          <Button
            variant="outline"
            onClick={carregarDadosOcupacao}
            disabled={carregandoDados}
            className="whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${carregandoDados ? 'animate-spin' : ''}`} />
            {carregandoDados ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        {/* Controles de Navegação */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Toggle entre Profissionais e Recursos */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {toggles.map((toggle) => {
              const Icon = toggle.icon;
              return (
                <button
                  key={toggle.value}
                  onClick={() => setTipoVisualizacao(toggle.value)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    tipoVisualizacao === toggle.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{toggle.label}</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {toggle.count}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Barra de Busca */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={`Buscar ${tipoVisualizacao === 'profissionais' ? 'profissional' : 'recurso'}...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                viewMode === 'table' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tabela
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                viewMode === 'cards' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cards
            </button>
          </div>
        </div>

        {/* Conteúdo Principal */}
        {viewMode === 'table' ? (
          <div className="bg-white rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {visibleColumns.map((column) => (
                    <th key={column.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item: any) => (
                  <tr key={item.id || item.profissionalId}>
                    {visibleColumns.map((column) => (
                      <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm">
                        {column.render ? column.render(item) : item[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">
                  {tipoVisualizacao === 'profissionais' ? <Stethoscope className="w-12 h-12 mx-auto" /> : <Building className="w-12 h-12 mx-auto" />}
                </div>
                <p className="text-gray-600">{`Nenhum ${tipoVisualizacao === 'profissionais' ? 'profissional' : 'recurso'} encontrado`}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData.map((item: any) => (
              <Card key={item.id || item.profissionalId} className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tipoVisualizacao === 'profissionais' 
                          ? 'bg-blue-100' 
                          : item.disponivel ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {tipoVisualizacao === 'profissionais' ? (
                          <Stethoscope className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Building className={`w-4 h-4 ${
                            item.disponivel ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        )}
                      </div>
                      <span className="truncate">{item.nome}</span>
                    </div>
                  </CardTitle>
                  {tipoVisualizacao === 'recursos' && (
                    <CardDescription>
                      {item.tipo}
                      {!item.disponivel && (
                        <span className="text-gray-500"> (Inativo)</span>
                      )}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Ocupação */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Ocupação</span>
                      <span className="font-medium">
                        {tipoVisualizacao === 'profissionais' 
                          ? `${item.ocupados}/${item.total}`
                          : `${item.percentualOcupacao}%`
                        }
                      </span>
                    </div>
                    <Progress 
                      value={tipoVisualizacao === 'profissionais' ? item.percentual : item.percentualOcupacao} 
                      className="h-2" 
                    />
                  </div>

                  {/* Percentual Badge */}
                  <div className="flex justify-center">
                    <Badge className={getOcupacaoColor(
                      tipoVisualizacao === 'profissionais' ? item.percentual : item.percentualOcupacao
                    ).bg + ' ' + getOcupacaoColor(
                      tipoVisualizacao === 'profissionais' ? item.percentual : item.percentualOcupacao
                    ).text}>
                      {tipoVisualizacao === 'profissionais' ? item.percentual : item.percentualOcupacao}%
                    </Badge>
                  </div>

                  {/* Agendamentos */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-medium text-gray-900">{item.agendamentosHoje}</div>
                      <div className="text-xs text-gray-600">Hoje</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-medium text-gray-900">{item.agendamentosProximos7}</div>
                      <div className="text-xs text-gray-600">7 dias</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredData.length === 0 && (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-400 mb-2">
                  {tipoVisualizacao === 'profissionais' ? <Stethoscope className="w-12 h-12 mx-auto" /> : <Building className="w-12 h-12 mx-auto" />}
                </div>
                <p className="text-gray-600">{`Nenhum ${tipoVisualizacao === 'profissionais' ? 'profissional' : 'recurso'} encontrado`}</p>
              </div>
            )}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6 space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Próxima
            </Button>
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
};