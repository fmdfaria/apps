import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Activity, 
  Building,
  Stethoscope,
 
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  AlertCircle,
  CalendarCheck
} from 'lucide-react';
import { getDadosOcupacao, type DadosOcupacao, type OcupacaoProfissional, type OcupacaoRecurso } from '@/services/ocupacao';
import { 
  PageContainer, 
  ResponsivePagination
} from '@/components/layout';

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

// Função para gerar cores de avatar baseada no nome
function getAvatarGradient(nome: string, tipo: 'profissional' | 'recurso') {
  const gradients = {
    profissional: [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-pink-500 to-rose-600',
      'from-cyan-500 to-blue-600',
    ],
    recurso: [
      'from-green-500 to-emerald-600',
      'from-teal-500 to-cyan-600',
      'from-blue-500 to-sky-600',
      'from-indigo-500 to-blue-600',
      'from-purple-500 to-violet-600',
      'from-amber-500 to-orange-600',
    ]
  };
  
  const hash = nome.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const gradientList = gradients[tipo];
  return gradientList[Math.abs(hash) % gradientList.length];
}

export const OcupacaoPage: React.FC = () => {
  const navigate = useNavigate();
  const [dadosOcupacao, setDadosOcupacao] = useState<DadosOcupacao | null>(null);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tipoVisualizacao, setTipoVisualizacao] = useState<TipoVisualizacao>('profissionais');
  const [busca, setBusca] = useState('');
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('tabela');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Dados computados baseados no tipo de visualização
  const dadosAtuais = useMemo(() => {
    if (!dadosOcupacao) return [];
    return tipoVisualizacao === 'profissionais' 
      ? dadosOcupacao.ocupacoesProfissionais 
      : dadosOcupacao.ocupacoesRecursos;
  }, [dadosOcupacao, tipoVisualizacao]);

  // Filtrar dados baseado apenas na busca textual
  const dadosFiltrados = useMemo(() => {
    if (!busca.trim()) return dadosAtuais;

    const buscaLower = busca.toLowerCase();
    return dadosAtuais.filter((item: any) => 
      item.nome.toLowerCase().includes(buscaLower)
    );
  }, [dadosAtuais, busca]);

  // Paginação
  const totalPages = Math.ceil(dadosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = dadosFiltrados.slice(startIndex, endIndex);

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


  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Loading state
  if (carregandoDados) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados de ocupação...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (erro) {
    return (
      <div className="h-full flex flex-col">
        {/* Header fixo */}
        <div className="flex-shrink-0 pt-2 pl-6 pr-6 bg-white border-b border-gray-200">
          <div className="flex justify-between items-center mb-6 px-6 py-4 rounded-lg">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-4xl">📊</span>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dashboard de Ocupação
              </span>
            </h1>
          </div>
        </div>

        {/* Error content */}
        <div className="flex-1 overflow-y-auto pt-2 pl-6 pr-6">
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
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header fixo */}
      <div className="flex-shrink-0 pt-2 pl-6 pr-6 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-4xl">📊</span>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dashboard de Ocupação
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Buscar ${tipoVisualizacao === 'profissionais' ? 'profissional' : 'recurso'}...`}
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Toggle de visualização */}
            <div className="flex border rounded-lg p-1 bg-gray-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisualizacao('tabela')}
                className={`h-7 px-3 ${visualizacao === 'tabela' ? 'bg-white shadow-sm' : ''}`}
              >
                <List className="w-4 h-4 mr-1" />
                Tabela
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisualizacao('cards')}
                className={`h-7 px-3 ${visualizacao === 'cards' ? 'bg-white shadow-sm' : ''}`}
              >
                <LayoutGrid className="w-4 h-4 mr-1" />
                Cards
              </Button>
            </div>
            
            <Button
              onClick={() => navigate('/agendamentos/verificar-agenda')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CalendarCheck className="w-4 h-4 mr-2" />
              Verificar Agenda
            </Button>
          </div>
        </div>

      </div>

      {/* Conteúdo com scroll independente */}
      <div className="flex-1 overflow-y-auto pt-2 pl-6 pr-6">
        {/* Toggle grande para separar Profissionais | Recursos */}
        <div className="mb-6">
          <Tabs 
            value={tipoVisualizacao} 
            onValueChange={(value) => setTipoVisualizacao(value as TipoVisualizacao)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger 
                value="profissionais" 
                className="flex items-center gap-2 transition-colors duration-200 text-base font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300"
              >
                <Stethoscope className="w-5 h-5" />
                Profissionais
                {dadosOcupacao && (
                  <Badge variant="secondary" className="ml-1">
                    {dadosOcupacao.ocupacoesProfissionais.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="recursos" 
                className="flex items-center gap-2 transition-colors duration-200 text-base font-medium data-[state=active]:bg-green-100 data-[state=active]:text-green-700 data-[state=active]:border-green-300"
              >
                <Building className="w-5 h-5" />
                Recursos
                {dadosOcupacao && (
                  <Badge variant="secondary" className="ml-1">
                    {dadosOcupacao.ocupacoesRecursos.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profissionais" className="mt-6">
              {renderContent()}
            </TabsContent>

            <TabsContent value="recursos" className="mt-6">
              {renderContent()}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer fixo na parte de baixo */}
      {dadosFiltrados.length > 0 && (
        <div className="flex-shrink-0">
          <ResponsivePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={dadosFiltrados.length}
            itemsPerPage={itemsPerPage}
            module="ocupacao"
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      )}
    </div>
  );

  function renderContent() {
    if (!dadosOcupacao) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum dado de ocupação disponível</p>
        </div>
      );
    }

    return (
      <>
        {visualizacao === 'tabela' ? renderTableView() : renderCardView()}
      </>
    );
  }

  function renderTableView() {
    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    {tipoVisualizacao === 'profissionais' ? (
                      <>
                        <span className="text-lg">👨‍⚕️</span>
                        Profissional
                      </>
                    ) : (
                      <>
                        <span className="text-lg">🏢</span>
                        Recurso
                      </>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">📊</span>
                    Ocupação
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">📈</span>
                    Percentual
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">📅</span>
                    Agendamentos
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        {tipoVisualizacao === 'profissionais' ? (
                          <Stethoscope className="w-8 h-8 text-gray-400" />
                        ) : (
                          <Building className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <p className="text-gray-500 font-medium">
                        {busca 
                          ? 'Nenhum resultado encontrado' 
                          : `Nenhum ${tipoVisualizacao === 'profissionais' ? 'profissional' : 'recurso'} encontrado`
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((item: any) => (
                  <tr key={item.id || item.profissionalId} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                    <td className="px-6 py-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 bg-gradient-to-r ${getAvatarGradient(
                          item.nome, 
                          tipoVisualizacao === 'profissionais' ? 'profissional' : 'recurso'
                        )} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                          {item.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{item.nome}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          {formatarOcupacao(item.ocupados, item.total)}
                        </div>
                        <Progress 
                          value={tipoVisualizacao === 'profissionais' ? item.percentual : item.percentualOcupacao} 
                          className="h-2 w-24 mx-auto" 
                        />
                      </div>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <Badge className={`${getOcupacaoColor(
                        tipoVisualizacao === 'profissionais' ? item.percentual : item.percentualOcupacao
                      ).bg} ${getOcupacaoColor(
                        tipoVisualizacao === 'profissionais' ? item.percentual : item.percentualOcupacao
                      ).text}`}>
                        {tipoVisualizacao === 'profissionais' ? item.percentual : item.percentualOcupacao}%
                      </Badge>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <div className="text-sm">
                        Hoje: <span className="font-medium">{item.agendamentosHoje}</span> | 7 dias: <span className="font-medium">{item.agendamentosProximos7}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderCardView() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentItems.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                {tipoVisualizacao === 'profissionais' ? (
                  <Stethoscope className="w-8 h-8 text-gray-400" />
                ) : (
                  <Building className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <p className="text-gray-500 font-medium">
                {busca 
                  ? 'Nenhum resultado encontrado' 
                  : `Nenhum ${tipoVisualizacao === 'profissionais' ? 'profissional' : 'recurso'} encontrado`
                }
              </p>
            </div>
          </div>
        ) : (
          currentItems.map((item: any) => (
            <Card key={item.id || item.profissionalId} className="h-full hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 bg-gradient-to-r ${getAvatarGradient(
                      item.nome, 
                      tipoVisualizacao === 'profissionais' ? 'profissional' : 'recurso'
                    )} rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                      {item.nome.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{item.nome}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Ocupação */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Ocupação</span>
                    <span className="font-medium">
                      {`${item.ocupados}/${item.total}`}
                    </span>
                  </div>
                  <Progress 
                    value={tipoVisualizacao === 'profissionais' ? item.percentual : item.percentualOcupacao} 
                    className="h-2" 
                  />
                </div>

                {/* Percentual Badge */}
                <div className="flex justify-center">
                  <Badge className={`${getOcupacaoColor(
                    tipoVisualizacao === 'profissionais' ? item.percentual : item.percentualOcupacao
                  ).bg} ${getOcupacaoColor(
                    tipoVisualizacao === 'profissionais' ? item.percentual : item.percentualOcupacao
                  ).text}`}>
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
          ))
        )}
      </div>
    );
  }
};