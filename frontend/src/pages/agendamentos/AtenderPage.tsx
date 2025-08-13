import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  Stethoscope,
  Clock,
  Users,
  Calendar,
  FileText,
  CreditCard,
  Search,
  LayoutGrid,
  List,
  CheckCircle2,
  Filter,
  FilterX,
  X,
  Eye,
  ClipboardList,
  CheckSquare,
  UserCheck,
  PenTool,
  UserCheck2,
  AlertCircle
} from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { getAgendamentos, updateCompareceu, updateAssinaturaPaciente, updateAssinaturaProfissional } from '@/services/agendamentos';
import { AtenderAgendamentoModal, DetalhesAgendamentoModal } from '@/components/agendamentos';
import ConfirmacaoModal from '@/components/ConfirmacaoModal';
import EvolucaoPacientesModal from '@/pages/pacientes/EvolucaoPacientesModal';
import { getPacientes } from '@/services/pacientes';
import { getEvolucaoByAgendamento, getStatusEvolucoesPorAgendamentos } from '@/services/evolucoes';
import type { Paciente } from '@/types/Paciente';
import type { EvolucaoPaciente } from '@/types/EvolucaoPaciente';
import api from '@/services/api';
import { AppToast } from '@/services/toast';
import { useAuthStore } from '@/store/auth';

export const AtenderPage = () => {
  const { user } = useAuthStore();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para controle de permissões RBAC
  const [accessDenied, setAccessDenied] = useState(false);
  const [canAtender, setCanAtender] = useState(true);
  const [busca, setBusca] = useState('');
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('tabela');
  const [showAtenderAgendamento, setShowAtenderAgendamento] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [showDetalhesAgendamento, setShowDetalhesAgendamento] = useState(false);
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null);
  const [showEvolucaoModal, setShowEvolucaoModal] = useState(false);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [agendamentoParaEvolucao, setAgendamentoParaEvolucao] = useState<Agendamento | null>(null);
  const [evolucaoExistente, setEvolucaoExistente] = useState<EvolucaoPaciente | null>(null);
  const [evolucoesMap, setEvolucoesMap] = useState<Map<string, boolean>>(new Map());
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Estados para os modais de confirmação
  const [showCompareceuModal, setShowCompareceuModal] = useState(false);
  const [showAssinaturaPacienteModal, setShowAssinaturaPacienteModal] = useState(false);
  const [showAssinaturaProfissionalModal, setShowAssinaturaProfissionalModal] = useState(false);
  const [agendamentoParaAtualizar, setAgendamentoParaAtualizar] = useState<Agendamento | null>(null);
  const [isLoadingUpdate, setIsLoadingUpdate] = useState(false);
  
  // Estados para modal de validação de finalização
  const [showValidacaoFinalizacaoModal, setShowValidacaoFinalizacaoModal] = useState(false);
  const [problemasFinalizacao, setProblemasFinalizacao] = useState<string[]>([]);

  // Filtros avançados por coluna
  const [filtros, setFiltros] = useState({
    paciente: '',
    profissional: '',
    servico: '',
    convenio: '',
    tipoAtendimento: '',
    dataInicio: '',
    dataFim: ''
  });

  useEffect(() => {
    checkPermissions();
    carregarAgendamentos();
    carregarPacientes();
  }, []);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, itensPorPagina, filtros]);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar apenas a permissão específica desta página
      const canAtender = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos-atender/:id' && route.method.toLowerCase() === 'put';
      });
      
      setCanAtender(canAtender);
      
      // Se não tem permissão de atendimento, marca como access denied
      if (!canAtender) {
        setAccessDenied(true);
      }
      
    } catch (error: any) {
      // Em caso de erro, desabilita tudo por segurança
      setCanAtender(false);
      
      // Se retornar 401/403 no endpoint de permissões, considera acesso negado
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  const carregarAgendamentos = async () => {
    // Não verifica canRead aqui pois a verificação é apenas para a permissão de atendimento
    setLoading(true);
    setAgendamentos([]); // Limpa agendamentos para evitar mostrar dados antigos
    try {
      let dados = await getAgendamentos();
      
      // Se o usuário for PROFISSIONAL, filtrar apenas os agendamentos dele
      if (user?.roles?.includes('PROFISSIONAL')) {
        // Buscar o profissional associado ao usuário
        try {
          const profissionalResponse = await api.get('/profissionais/me');
          const profissionalId = profissionalResponse.data.id;
          
          // Filtrar agendamentos apenas deste profissional
          dados = dados.filter(agendamento => agendamento.profissionalId === profissionalId);
        } catch (profissionalError) {
          console.error('Erro ao buscar dados do profissional:', profissionalError);
          AppToast.error('Erro ao carregar dados do profissional', {
            description: 'Não foi possível carregar os agendamentos do profissional.'
          });
          dados = []; // Se não conseguir buscar o profissional, não mostra nenhum agendamento
        }
      }
      
      setAgendamentos(dados);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setAccessDenied(true);
        // Não mostra toast aqui pois o interceptor já cuida disso
      } else {
        AppToast.error('Erro ao carregar agendamentos', {
          description: 'Ocorreu um problema ao carregar a lista de agendamentos. Tente novamente.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateFiltro = (campo: keyof typeof filtros, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
    setPaginaAtual(1);
  };

  const limparFiltros = () => {
    setFiltros({
      paciente: '',
      profissional: '',
      servico: '',
      convenio: '',
      tipoAtendimento: '',
      dataInicio: '',
      dataFim: ''
    });
    setPaginaAtual(1);
  };

  const temFiltrosAtivos = Object.values(filtros).some(filtro => filtro !== '');

  // Função para formatar data no formato brasileiro
  const formatarDataBrasil = (dataISO: string) => {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const agendamentosFiltrados = agendamentos
    .filter(a => a.status === 'LIBERADO')
    .filter(a => 
      !busca || 
      a.pacienteNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.profissionalNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.servicoNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.convenioNome?.toLowerCase().includes(busca.toLowerCase())
    )
    // Filtros avançados por coluna
    .filter(a => !filtros.paciente || a.pacienteNome?.toLowerCase().includes(filtros.paciente.toLowerCase()))
    .filter(a => !filtros.profissional || a.profissionalNome?.toLowerCase().includes(filtros.profissional.toLowerCase()))
    .filter(a => !filtros.servico || a.servicoNome?.toLowerCase().includes(filtros.servico.toLowerCase()))
    .filter(a => !filtros.convenio || a.convenioNome?.toLowerCase().includes(filtros.convenio.toLowerCase()))
    .filter(a => !filtros.tipoAtendimento || a.tipoAtendimento === filtros.tipoAtendimento)
    .filter(a => {
      if (!filtros.dataInicio && !filtros.dataFim) return true;
      
      // Extrair apenas a data (YYYY-MM-DD) do agendamento, ignorando horário e timezone
      const dataAgendamentoISO = a.dataHoraInicio.split('T')[0]; // '2024-02-12'
      
      // Comparar apenas as datas no formato YYYY-MM-DD
      if (filtros.dataInicio && dataAgendamentoISO < filtros.dataInicio) return false;
      if (filtros.dataFim && dataAgendamentoISO > filtros.dataFim) return false;
      
      return true;
    })
    .sort((a, b) => {
      // Ordenação personalizada: Data > Hora > Paciente
      
      // 1. Extrair data e hora de cada agendamento
      const [dataA, horaA] = a.dataHoraInicio.split('T');
      const [dataB, horaB] = b.dataHoraInicio.split('T');
      
      // 2. Comparar primeiro por data
      const comparacaoData = dataA.localeCompare(dataB);
      if (comparacaoData !== 0) {
        return comparacaoData;
      }
      
      // 3. Se datas iguais, comparar por hora
      const comparacaoHora = horaA.localeCompare(horaB);
      if (comparacaoHora !== 0) {
        return comparacaoHora;
      }
      
      // 4. Se data e hora iguais, comparar por nome do paciente
      return (a.pacienteNome || '').localeCompare(b.pacienteNome || '', 'pt-BR', { 
        sensitivity: 'base' 
      });
    });

  const totalPaginas = Math.ceil(agendamentosFiltrados.length / itensPorPagina);
  const agendamentosPaginados = agendamentosFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  // Carregar evoluções quando os agendamentos, filtros ou paginação mudarem
  useEffect(() => {
    const agendamentosPagina = agendamentosFiltrados.slice(
      (paginaAtual - 1) * itensPorPagina,
      paginaAtual * itensPorPagina
    );
    
    if (agendamentosPagina.length > 0) {
      carregarEvolucoes(agendamentosPagina);
    }
  }, [agendamentos, busca, filtros, paginaAtual, itensPorPagina]);

  const formatarDataHora = (dataHoraISO: string) => {
    // Parse da string sem conversão de timezone
    // Formato esperado: "2025-08-04T10:00:00.000Z" 
    const [datePart, timePart] = dataHoraISO.split('T');
    const [ano, mes, dia] = datePart.split('-');
    const [hora, minuto] = timePart.split(':');
    
    return {
      data: `${dia}/${mes}/${ano}`,
      hora: `${hora}:${minuto}`
    };
  };

  const handleVerDetalhes = (agendamento: Agendamento) => {
    setAgendamentoDetalhes(agendamento);
    setShowDetalhesAgendamento(true);
  };

  const handleAbrirProntuario = async (agendamento: Agendamento) => {
    setAgendamentoParaEvolucao(agendamento);
    const temEvolucao = evolucoesMap.get(agendamento.id) === true;
    
    if (!temEvolucao) {
      // Já sabemos pelo batch que não existe evolução → abrir em modo criação sem chamar API
      setEvolucaoExistente(null);
      setShowEvolucaoModal(true);
      return;
    }

    try {
      // Somente busca detalhes se o batch indicou que existe evolução
      const evolucaoEncontrada = await getEvolucaoByAgendamento(agendamento.id);
      setEvolucaoExistente(evolucaoEncontrada);
    } catch (_err) {
      // Evitar logs no console; abre como criação se houver qualquer problema
      setEvolucaoExistente(null);
    } finally {
      setShowEvolucaoModal(true);
    }
  };

  const carregarPacientes = async () => {
    try {
      const dados = await getPacientes();
      setPacientes(dados);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      AppToast.error('Erro ao carregar pacientes');
    }
  };

  const carregarEvolucoes = async (agendamentos: Agendamento[]) => {
    try {
      const ids = agendamentos.map(a => a.id);
      if (ids.length === 0) {
        setEvolucoesMap(new Map());
        return;
      }
      const resultados = await getStatusEvolucoesPorAgendamentos(ids);
      const novoMap = new Map<string, boolean>();
      resultados.forEach(({ agendamentoId, temEvolucao }) => {
        novoMap.set(agendamentoId, temEvolucao);
      });
      setEvolucoesMap(novoMap);
    } catch (error) {
      console.error('Erro ao carregar evoluções:', error);
      // fallback: marca todos como false para não quebrar UI
      const fallbackMap = new Map<string, boolean>();
      agendamentos.forEach(a => fallbackMap.set(a.id, false));
      setEvolucoesMap(fallbackMap);
    }
  };

  // Handlers para os novos campos
  const handleCompareceu = (agendamento: Agendamento) => {
    setAgendamentoParaAtualizar(agendamento);
    setShowCompareceuModal(true);
  };

  const handleAssinaturaPaciente = (agendamento: Agendamento) => {
    setAgendamentoParaAtualizar(agendamento);
    setShowAssinaturaPacienteModal(true);
  };

  const handleAssinaturaProfissional = (agendamento: Agendamento) => {
    setAgendamentoParaAtualizar(agendamento);
    setShowAssinaturaProfissionalModal(true);
  };

  // Handlers para cancelar (apenas fechar modal sem salvar)
  const handleCancelCompareceu = () => {
    setShowCompareceuModal(false);
    setAgendamentoParaAtualizar(null);
  };

  const handleCancelAssinaturaPaciente = () => {
    setShowAssinaturaPacienteModal(false);
    setAgendamentoParaAtualizar(null);
  };

  const handleCancelAssinaturaProfissional = () => {
    setShowAssinaturaProfissionalModal(false);
    setAgendamentoParaAtualizar(null);
  };

  const handleConfirmCompareceu = async (compareceu: boolean | null) => {
    if (!agendamentoParaAtualizar) return;

    setIsLoadingUpdate(true);
    try {
      await updateCompareceu(agendamentoParaAtualizar.id, compareceu);
      AppToast.success(compareceu ? 'Comparecimento confirmado!' : 'Comparecimento marcado como NÃO', {
        description: `Status de comparecimento atualizado com sucesso.`
      });
      carregarAgendamentos(); // Recarregar a lista
    } catch (error) {
      AppToast.error('Erro ao atualizar comparecimento', {
        description: 'Ocorreu um erro ao salvar as alterações. Tente novamente.'
      });
    } finally {
      setIsLoadingUpdate(false);
      setShowCompareceuModal(false);
      setAgendamentoParaAtualizar(null);
    }
  };

  const handleConfirmAssinaturaPaciente = async (assinou: boolean | null) => {
    if (!agendamentoParaAtualizar) return;

    setIsLoadingUpdate(true);
    try {
      await updateAssinaturaPaciente(agendamentoParaAtualizar.id, assinou);
      AppToast.success(assinou ? 'Assinatura do paciente confirmada!' : 'Assinatura do paciente marcada como NÃO', {
        description: `Status da assinatura atualizado com sucesso.`
      });
      carregarAgendamentos(); // Recarregar a lista
    } catch (error) {
      AppToast.error('Erro ao atualizar assinatura do paciente', {
        description: 'Ocorreu um erro ao salvar as alterações. Tente novamente.'
      });
    } finally {
      setIsLoadingUpdate(false);
      setShowAssinaturaPacienteModal(false);
      setAgendamentoParaAtualizar(null);
    }
  };

  const handleConfirmAssinaturaProfissional = async (assinou: boolean | null) => {
    if (!agendamentoParaAtualizar) return;

    setIsLoadingUpdate(true);
    try {
      await updateAssinaturaProfissional(agendamentoParaAtualizar.id, assinou);
      AppToast.success(assinou ? 'Sua assinatura confirmada!' : 'Sua assinatura marcada como NÃO', {
        description: `Status da assinatura atualizado com sucesso.`
      });
      carregarAgendamentos(); // Recarregar a lista
    } catch (error) {
      AppToast.error('Erro ao atualizar assinatura profissional', {
        description: 'Ocorreu um erro ao salvar as alterações. Tente novamente.'
      });
    } finally {
      setIsLoadingUpdate(false);
      setShowAssinaturaProfissionalModal(false);
      setAgendamentoParaAtualizar(null);
    }
  };

  // Função para validar se pode finalizar o atendimento
  const validarFinalizacaoAtendimento = (agendamento: Agendamento): { podeFinalizarAtendimento: boolean; problemas: string[] } => {
    const problemas: string[] = [];
    
    // Verificar se tem evolução
    const temEvolucao = evolucoesMap.get(agendamento.id) === true;
    if (!temEvolucao) {
      problemas.push('• Evolução não foi registrada');
    }
    
    // Verificar comparecimento
    if (agendamento.compareceu === null || agendamento.compareceu === undefined) {
      problemas.push('• Status de comparecimento não foi definido');
    }
    
    // Verificar assinatura do paciente
    if (agendamento.assinaturaPaciente !== true) {
      problemas.push('• Paciente não assinou a guia');
    }
    
    // Verificar assinatura do profissional
    if (agendamento.assinaturaProfissional !== true) {
      problemas.push('• Profissional não assinou a guia');
    }
    
    return {
      podeFinalizarAtendimento: problemas.length === 0,
      problemas
    };
  };

  // Handler modificado para o botão Finalizar Atendimento
  const handleAtender = (agendamento: Agendamento) => {
    const { podeFinalizarAtendimento, problemas } = validarFinalizacaoAtendimento(agendamento);
    
    if (podeFinalizarAtendimento) {
      // Pode finalizar - abrir modal normal
      setAgendamentoSelecionado(agendamento);
      setShowAtenderAgendamento(true);
    } else {
      // Não pode finalizar - mostrar problemas
      setProblemasFinalizacao(problemas);
      setShowValidacaoFinalizacaoModal(true);
    }
  };

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {agendamentosPaginados.length === 0 ? (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
          <Stethoscope className="w-12 h-12 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Nenhum agendamento liberado para atendimento
          </h3>
          <p className="text-sm">
            {(busca || temFiltrosAtivos) ? 'Tente alterar os filtros de busca.' : 'Aguardando agendamentos liberados.'}
          </p>
        </div>
      ) : (
        agendamentosPaginados.map(agendamento => {
          const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
          
          return (
            <Card key={agendamento.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {agendamento.pacienteNome?.charAt(0).toUpperCase()}
                    </div>
                    <CardTitle className="text-lg">{agendamento.pacienteNome}</CardTitle>
                  </div>
                  <Badge className={`text-xs px-3 py-1 rounded-full font-medium ${
                    agendamento.status === 'LIBERADO' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {agendamento.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Informações Básicas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{data}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="font-mono bg-blue-100 px-2 py-1 rounded text-blue-700">{hora}</span>
                  </div>
                </div>

                {/* Detalhes do Atendimento */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">Profissional:</span>
                    <span>{agendamento.profissionalNome}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CreditCard className="w-4 h-4" />
                    <span className="font-medium">Convênio:</span>
                    <span>{agendamento.convenioNome}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">Serviço:</span>
                    <span>{agendamento.servicoNome}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-lg">🏥</span>
                    <span className="font-medium">Tipo:</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      agendamento.tipoAtendimento === 'online' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {agendamento.tipoAtendimento}
                    </span>
                  </div>
                </div>

                {/* Status dos Processos */}
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Status dos Processos</h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Evolução:</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        evolucoesMap.get(agendamento.id) 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {evolucoesMap.get(agendamento.id) ? 'SIM' : 'NÃO'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Compareceu:</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        agendamento.compareceu === true
                          ? 'bg-green-100 text-green-800' 
                          : agendamento.compareceu === false
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {agendamento.compareceu === true ? 'SIM' : agendamento.compareceu === false ? 'NÃO' : 'PENDENTE'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Pac. Assinou:</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        agendamento.assinaturaPaciente === true
                          ? 'bg-green-100 text-green-800' 
                          : agendamento.assinaturaPaciente === false
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {agendamento.assinaturaPaciente === true ? 'SIM' : agendamento.assinaturaPaciente === false ? 'NÃO' : 'PENDENTE'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Prof. Assinou:</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        agendamento.assinaturaProfissional === true
                          ? 'bg-green-100 text-green-800' 
                          : agendamento.assinaturaProfissional === false
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {agendamento.assinaturaProfissional === true ? 'SIM' : agendamento.assinaturaProfissional === false ? 'NÃO' : 'PENDENTE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-col gap-1 pt-2 border-t">
                  <div className="flex justify-center gap-1">
                    <Button 
                      size="sm" 
                      variant="default"
                      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                      onClick={() => handleVerDetalhes(agendamento)}
                      title="Visualizar Agendamento"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="group border-2 border-purple-300 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-purple-600 focus:ring-4 focus:ring-purple-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                      onClick={() => handleAbrirProntuario(agendamento)}
                      title="Prontuário"
                    >
                      <ClipboardList className="w-4 h-4 text-purple-600 group-hover:text-white transition-colors" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="group border-2 border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                      onClick={() => handleCompareceu(agendamento)}
                      title="Marcar comparecimento"
                    >
                      <UserCheck className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="group border-2 border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white hover:border-orange-600 focus:ring-4 focus:ring-orange-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                      onClick={() => handleAssinaturaPaciente(agendamento)}
                      title="Assinatura do paciente"
                    >
                      <PenTool className="w-4 h-4 text-orange-600 group-hover:text-white transition-colors" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="group border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 focus:ring-4 focus:ring-indigo-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                      onClick={() => handleAssinaturaProfissional(agendamento)}
                      title="Sua assinatura"
                    >
                      <UserCheck2 className="w-4 h-4 text-indigo-600 group-hover:text-white transition-colors" />
                    </Button>
                    {canAtender ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="group border-2 border-green-300 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600 focus:ring-4 focus:ring-green-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleAtender(agendamento)}
                        title="Finalizar Atendimento"
                      >
                        <CheckSquare className="w-4 h-4 text-green-600 group-hover:text-white transition-colors" />
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        disabled={true}
                        className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                        title="Você não tem permissão para finalizar atendimentos"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  const renderTableView = () => (
    <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  Data
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⏰</span>
                  Horário
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👤</span>
                  Paciente
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👨‍⚕️</span>
                  Profissional
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏥</span>
                  Convênio
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🩺</span>
                  Serviço
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏷️</span>
                  Tipo
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  Status
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  Evolução
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  Compareceu?
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✍️</span>
                  Paciente Assinou?
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👨‍⚕️</span>
                  Profissional Assinou?
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚙️</span>
                  Ações
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {agendamentosPaginados.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🩺</span>
                  </div>
                  <p className="text-gray-500 font-medium">
                    {(busca || temFiltrosAtivos) ? 'Nenhum resultado encontrado' : 'Nenhum agendamento para atendimento'}
                  </p>
                  <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            agendamentosPaginados.map((agendamento) => {
              const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
              
              return (
                <TableRow key={agendamento.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 h-12">
                  <TableCell className="py-2">
                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{data}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm font-mono bg-blue-100 px-2 py-1 rounded text-blue-700">{hora}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {agendamento.pacienteNome?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{agendamento.pacienteNome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm">{agendamento.profissionalNome}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm">{agendamento.convenioNome}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm">{agendamento.servicoNome}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      agendamento.tipoAtendimento === 'online' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {agendamento.tipoAtendimento}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      agendamento.status === 'LIBERADO' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {agendamento.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      evolucoesMap.get(agendamento.id) 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {evolucoesMap.get(agendamento.id) ? 'SIM' : 'NÃO'}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      agendamento.compareceu === true
                        ? 'bg-green-100 text-green-800' 
                        : agendamento.compareceu === false
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {agendamento.compareceu === true ? 'SIM' : agendamento.compareceu === false ? 'NÃO' : 'PENDENTE'}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      agendamento.assinaturaPaciente === true
                        ? 'bg-green-100 text-green-800' 
                        : agendamento.assinaturaPaciente === false
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {agendamento.assinaturaPaciente === true ? 'SIM' : agendamento.assinaturaPaciente === false ? 'NÃO' : 'PENDENTE'}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      agendamento.assinaturaProfissional === true
                        ? 'bg-green-100 text-green-800' 
                        : agendamento.assinaturaProfissional === false
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {agendamento.assinaturaProfissional === true ? 'SIM' : agendamento.assinaturaProfissional === false ? 'NÃO' : 'PENDENTE'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleVerDetalhes(agendamento)}
                        title="Visualizar Agendamento"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="group border-2 border-purple-300 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-purple-600 focus:ring-4 focus:ring-purple-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleAbrirProntuario(agendamento)}
                        title="Prontuário"
                      >
                        <ClipboardList className="w-4 h-4 text-purple-600 group-hover:text-white transition-colors" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="group border-2 border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleCompareceu(agendamento)}
                        title="Marcar comparecimento"
                      >
                        <UserCheck className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="group border-2 border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white hover:border-orange-600 focus:ring-4 focus:ring-orange-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleAssinaturaPaciente(agendamento)}
                        title="Assinatura do paciente"
                      >
                        <PenTool className="w-4 h-4 text-orange-600 group-hover:text-white transition-colors" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="group border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 focus:ring-4 focus:ring-indigo-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleAssinaturaProfissional(agendamento)}
                        title="Sua assinatura"
                      >
                        <UserCheck2 className="w-4 h-4 text-indigo-600 group-hover:text-white transition-colors" />
                      </Button>
                      {canAtender ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-green-300 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600 focus:ring-4 focus:ring-green-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => handleAtender(agendamento)}
                          title="Finalizar Atendimento"
                        >
                          <CheckSquare className="w-4 h-4 text-green-600 group-hover:text-white transition-colors" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={true}
                          className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                          title="Você não tem permissão para finalizar atendimentos"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
  );

  if (loading) {
    return (
      <div className="pt-2 pl-6 pr-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  // Tela de acesso negado
  if (accessDenied) {
    return (
      <div className="pt-2 pl-6 pr-6 h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar esta funcionalidade.
          </p>
          
          
          <p className="text-sm text-gray-500">
            Entre em contato com o administrador do sistema para solicitar as devidas permissões.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2 pl-6 pr-6 h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white backdrop-blur border-b border-gray-200 flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">🩺</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Atendimento de Agendamentos
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar agendamentos..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-blue-300"
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

          {/* Botão Filtros Avançados */}
          <Button
            variant="outline"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`${mostrarFiltros ? 'bg-blue-50 border-blue-300' : ''} ${temFiltrosAtivos ? 'border-blue-500 bg-blue-50' : ''}`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {temFiltrosAtivos && (
              <Badge variant="secondary" className="ml-2 h-4 px-1">
                {Object.values(filtros).filter(f => f !== '').length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Painel de Filtros Avançados */}
      {mostrarFiltros && (
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filtros Avançados</h3>
            <div className="flex gap-2">
              {temFiltrosAtivos && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limparFiltros}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <FilterX className="w-4 h-4 mr-1" />
                  Limpar Filtros
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarFiltros(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Filtro Data Início */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Data Início</span>
              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => updateFiltro('dataInicio', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro Data Fim */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Data Fim</span>
              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => updateFiltro('dataFim', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro Convênio */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Convênio</span>
              <input
                type="text"
                placeholder="Nome do convênio..."
                value={filtros.convenio}
                onChange={(e) => updateFiltro('convenio', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro Serviço */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Serviço</span>
              <input
                type="text"
                placeholder="Nome do serviço..."
                value={filtros.servico}
                onChange={(e) => updateFiltro('servico', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro Tipo Atendimento */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Tipo Atendimento</span>
              <select
                value={filtros.tipoAtendimento}
                onChange={(e) => updateFiltro('tipoAtendimento', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os tipos</option>
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
              </select>
            </div>

            {/* Filtro Paciente */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Paciente</span>
              <input
                type="text"
                placeholder="Nome do paciente..."
                value={filtros.paciente}
                onChange={(e) => updateFiltro('paciente', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro Profissional */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Profissional</span>
              <input
                type="text"
                placeholder="Nome do profissional..."
                value={filtros.profissional}
                onChange={(e) => updateFiltro('profissional', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Resumo dos Filtros Ativos */}
          {temFiltrosAtivos && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-gray-600">Filtros ativos:</span>
                {Object.entries(filtros)
                  .filter(([_, valor]) => valor !== '')
                  .map(([campo, valor]) => {
                    const labels = {
                      paciente: 'Paciente',
                      profissional: 'Profissional', 
                      servico: 'Serviço',
                      convenio: 'Convênio',
                      tipoAtendimento: 'Tipo',
                      dataInicio: 'De',
                      dataFim: 'Até'
                    };
                    
                    // Formatar valor para datas no formato brasileiro
                    const valorFormatado = (campo === 'dataInicio' || campo === 'dataFim') 
                      ? formatarDataBrasil(valor) 
                      : valor;
                    
                    return (
                      <Badge key={campo} variant="secondary" className="text-xs inline-flex items-center gap-1">
                        {labels[campo as keyof typeof labels]}: {valorFormatado}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateFiltro(campo as keyof typeof filtros, '')}
                          className="h-4 w-4 p-0 hover:text-red-600 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-100">
        {visualizacao === 'cards' ? renderCardView() : renderTableView()}
      </div>

      {/* Paginação */}
      {agendamentosFiltrados.length > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-6 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <span className="text-lg">📊</span>
            Exibir
          </span>
          <select
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-blue-300"
            value={itensPorPagina}
            onChange={e => setItensPorPagina(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map(qtd => (
              <option key={qtd} value={qtd}>{qtd}</option>
            ))}
          </select>
          <span className="text-sm text-gray-600">itens por página</span>
        </div>
        
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <span className="text-lg">📈</span>
          Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, agendamentosFiltrados.length)} de {agendamentosFiltrados.length} resultados
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
            disabled={paginaAtual === 1 || totalPaginas === 1}
            className={(paginaAtual === 1 || totalPaginas === 1)
              ? "border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed font-medium shadow-none hover:bg-gray-50" 
              : "border-2 border-gray-200 text-gray-700 hover:border-blue-500 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            }
          >
            <span className="mr-1 text-gray-600 group-hover:text-blue-600 transition-colors">⬅️</span>
            Anterior
          </Button>
          {(() => {
            const startPage = Math.max(1, Math.min(paginaAtual - 2, totalPaginas - 4));
            const endPage = Math.min(totalPaginas, startPage + 4);
            return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
              <Button
                key={page}
                variant={page === paginaAtual ? "default" : "outline"}
                size="sm"
                onClick={() => totalPaginas > 1 ? setPaginaAtual(page) : undefined}
                disabled={totalPaginas === 1}
                className={page === paginaAtual 
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg font-semibold" 
                  : totalPaginas === 1
                  ? "border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed font-medium shadow-none hover:bg-gray-50"
                  : "border-2 border-gray-200 text-gray-700 hover:border-blue-500 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
                }
              >
                {page}
              </Button>
            ));
          })()}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
            disabled={paginaAtual === totalPaginas || totalPaginas === 1}
            className={(paginaAtual === totalPaginas || totalPaginas === 1)
              ? "border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed font-medium shadow-none hover:bg-gray-50"
              : "border-2 border-gray-200 text-gray-700 hover:border-blue-500 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            }
          >
            Próximo
            <span className="ml-1 text-gray-600 group-hover:text-blue-600 transition-colors">➡️</span>
          </Button>
        </div>
        </div>
      )}

      {/* Modais */}
      <AtenderAgendamentoModal
        isOpen={showAtenderAgendamento}
        agendamento={agendamentoSelecionado}
        onClose={() => {
          setShowAtenderAgendamento(false);
          setAgendamentoSelecionado(null);
        }}
        onSuccess={carregarAgendamentos}
      />

      <DetalhesAgendamentoModal
        isOpen={showDetalhesAgendamento}
        agendamento={agendamentoDetalhes}
        onClose={() => {
          setShowDetalhesAgendamento(false);
          setAgendamentoDetalhes(null);
        }}
      />

      <EvolucaoPacientesModal
        open={showEvolucaoModal}
        onClose={() => {
          setShowEvolucaoModal(false);
          setAgendamentoParaEvolucao(null);
          setEvolucaoExistente(null);
        }}
        onSuccess={() => {
          // Atualizar o mapa de evoluções para refletir a mudança
          if (agendamentoParaEvolucao) {
            setEvolucoesMap(prev => {
              const novoMap = new Map(prev);
              novoMap.set(agendamentoParaEvolucao.id, true);
              return novoMap;
            });
          }
        }}
        onDeleted={(agendamentoId) => {
          setEvolucoesMap(prev => {
            const novoMap = new Map(prev);
            novoMap.set(agendamentoId, false);
            return novoMap;
          });
        }}
        pacientes={pacientes}
        evolucaoParaEditar={evolucaoExistente}
        agendamentoInicial={agendamentoParaEvolucao}
      />

      {/* Modais de confirmação para os novos campos */}
      <ConfirmacaoModal
        open={showCompareceuModal}
        onClose={handleCancelCompareceu}
        onCancel={() => handleConfirmCompareceu(false)}
        onConfirm={() => handleConfirmCompareceu(true)}
        title="Confirmação de Comparecimento"
        description="O paciente compareceu?"
        confirmText="SIM"
        cancelText="NÃO"
        isLoading={isLoadingUpdate}
        loadingText="Salvando..."
        variant="default"
        icon={<UserCheck className="w-6 h-6" />}
      />

      <ConfirmacaoModal
        open={showAssinaturaPacienteModal}
        onClose={handleCancelAssinaturaPaciente}
        onCancel={() => handleConfirmAssinaturaPaciente(false)}
        onConfirm={() => handleConfirmAssinaturaPaciente(true)}
        title="Assinatura do Paciente"
        description="O paciente assinou a guia referente ao atendimento?"
        confirmText="SIM"
        cancelText="NÃO"
        isLoading={isLoadingUpdate}
        loadingText="Salvando..."
        variant="default"
        icon={<PenTool className="w-6 h-6" />}
      />

      <ConfirmacaoModal
        open={showAssinaturaProfissionalModal}
        onClose={handleCancelAssinaturaProfissional}
        onCancel={() => handleConfirmAssinaturaProfissional(false)}
        onConfirm={() => handleConfirmAssinaturaProfissional(true)}
        title="Assinatura do Profissional"
        description="Você (profissional) assinou a guia referente ao atendimento?"
        confirmText="SIM"
        cancelText="NÃO"
        isLoading={isLoadingUpdate}
        loadingText="Salvando..."
        variant="default"
        icon={<UserCheck2 className="w-6 h-6" />}
      />

      {/* Modal de validação para finalização de atendimento */}
      <ConfirmacaoModal
        open={showValidacaoFinalizacaoModal}
        onClose={() => setShowValidacaoFinalizacaoModal(false)}
        onConfirm={() => setShowValidacaoFinalizacaoModal(false)}
        title="Não é possível finalizar o atendimento"
        description={
          <>
            <p className="mb-3">Para finalizar o atendimento, você precisa resolver os seguintes problemas:</p>
            <div className="bg-orange-50 border-l-4 border-orange-400 p-3 mb-3">
              {problemasFinalizacao.map((problema, index) => (
                <p key={index} className="text-sm text-orange-800 mb-1 last:mb-0">
                  {problema}
                </p>
              ))}
            </div>
            <p className="text-sm">Após resolver estes itens, você poderá finalizar o atendimento.</p>
          </>
        }
        confirmText="Entendi"
        cancelText=""
        variant="warning"
        icon={<AlertCircle className="w-6 h-6" />}
      />
    </div>
  );
}; 