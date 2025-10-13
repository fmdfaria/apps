import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { 
  Building,
  Stethoscope,
  Search,
  RefreshCw,
  AlertCircle,
  CalendarCheck,
  Filter,
  Calendar,
  Clock,
  Activity,
  TrendingUp
} from 'lucide-react';
import { AgendamentoModal } from '@/components/agendamentos';
import { 
  PageContainer, 
  ResponsivePagination
} from '@/components/layout';
import { getServicos } from '@/services/servicos';
import { getAgendamentos } from '@/services/agendamentos';
import { getProfissionaisServicos } from '@/services/profissionais-servicos';
import { getAllDisponibilidades } from '@/services/disponibilidades';
import { getDadosOcupacao, type OcupacaoProfissional } from '@/services/ocupacao';
import type { Servico } from '@/types/Servico';
import type { Agendamento } from '@/types/Agendamento';
import type { ProfissionalServico } from '@/services/profissionais-servicos';
import type { DisponibilidadeProfissional } from '@/types/DisponibilidadeProfissional';

// Removido: Tipo para definir o que está sendo visualizado

// Função para obter cores baseadas no percentual de ocupação
function getOcupacaoColor(percentual: number) {
  if (percentual >= 80) return { bg: 'bg-red-100', text: 'text-red-800' };
  if (percentual >= 60) return { bg: 'bg-orange-100', text: 'text-orange-800' };
  if (percentual >= 40) return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
  return { bg: 'bg-green-100', text: 'text-green-800' };
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

// Opções para dias da semana (JavaScript: 0=Domingo, 1=Segunda, etc.)
const DIAS_SEMANA = [
  { id: '1', nome: 'Segunda-feira' }, // JS day = 1
  { id: '2', nome: 'Terça-feira' },   // JS day = 2
  { id: '3', nome: 'Quarta-feira' },  // JS day = 3
  { id: '4', nome: 'Quinta-feira' },  // JS day = 4
  { id: '5', nome: 'Sexta-feira' },   // JS day = 5
  { id: '6', nome: 'Sábado' },        // JS day = 6
  // Domingo (JS day = 0) não incluído - clínicas geralmente não atendem domingo
];

// Opções para períodos
const PERIODOS = [
  { id: 'manha', nome: 'Manhã' },
  { id: 'tarde', nome: 'Tarde' },
  { id: 'noite', nome: 'Noite' },
];

// Opções para tipo de agendamento
const TIPOS_AGENDAMENTO = [
  { id: 'presencial', nome: 'Presencial' },
  { id: 'online', nome: 'Online' },
];

// Interface para slots disponíveis
interface SlotDisponivel {
  profissionalId: string;
  profissionalNome: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:mm
  tipo: 'presencial' | 'online';
  servicoId: string;
  servicoNome: string;
  duracaoMinutos: number;
  // Dados de ocupação (próximos 7 dias)
  ocupados: number;
  total: number;
  percentual: number;
  agendamentosHoje: number;
  agendamentosProximos7: number;
}

export const VerificarAgendaPage: React.FC = () => {
  const [slotsDisponiveis, setSlotsDisponiveis] = useState<SlotDisponivel[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Estados do formulário
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoSelecionado, setServicoSelecionado] = useState<{id: string, nome: string} | null>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<{id: string, nome: string} | null>(null);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<{id: string, nome: string} | null>(null);
  const [tipoAgendamentoSelecionado, setTipoAgendamentoSelecionado] = useState<{id: string, nome: string} | null>(null);
  const [carregandoServicos, setCarregandoServicos] = useState(false);
  const [carregandoVerificacao, setCarregandoVerificacao] = useState(false);
  const [dadosOcupacao, setDadosOcupacao] = useState<OcupacaoProfissional[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Estados para modal de agendamento
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [preenchimentoInicialModal, setPreenchimentoInicialModal] = useState<any>(undefined);

  // Filtrar slots baseado na busca textual
  const slotsAtuais = useMemo(() => {
    return slotsDisponiveis || [];
  }, [slotsDisponiveis]);

  // Filtrar slots baseado apenas na busca textual
  const slotsFiltrados = useMemo(() => {
    if (!busca.trim()) return slotsAtuais;

    const buscaLower = busca.toLowerCase();
    return slotsAtuais.filter((slot: SlotDisponivel) => 
      slot.profissionalNome.toLowerCase().includes(buscaLower) ||
      slot.servicoNome.toLowerCase().includes(buscaLower)
    );
  }, [slotsAtuais, busca]);

  // Paginação
  const totalPages = Math.ceil(slotsFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = slotsFiltrados.slice(startIndex, endIndex);

  // Carregamento inicial
  useEffect(() => {
    carregarServicos();
    setInitialized(true);
  }, []);

  // Recarregar quando filtros relevantes mudam
  useEffect(() => {
    if (initialized && servicoSelecionado) {
      // Pode executar verificação automatica ou aguardar ação do usuário
      // Por enquanto, apenas logica se necessário
    }
  }, [servicoSelecionado, diaSelecionado, periodoSelecionado, tipoAgendamentoSelecionado, initialized]);

  const verificarAgenda = async () => {
    if (!servicoSelecionado || !diaSelecionado || !periodoSelecionado || !tipoAgendamentoSelecionado) {
      setErro('Por favor, preencha todos os filtros antes de verificar a agenda.');
      return;
    }

    try {
      setCarregandoVerificacao(true);
      setErro(null);
      setSlotsDisponiveis([]);
      
      // 1. Buscar agendamentos dos próximos 30 dias para otimização
      // IMPORTANTE: Não filtrar por servicoId aqui, pois precisamos verificar conflitos
      // de horário com TODOS os agendamentos do profissional, independente do serviço
      const hoje = new Date();
      const dataFim = new Date(hoje);
      dataFim.setDate(hoje.getDate() + 30);

      const dataInicioStr = hoje.toISOString().split('T')[0];
      const dataFimStr = dataFim.toISOString().split('T')[0];

      const agendamentosResponse = await getAgendamentos({
        dataInicio: dataInicioStr,
        dataFim: dataFimStr
        // Não incluir servicoId: precisamos ver todos os agendamentos para evitar conflitos
      });
      const agendamentos = agendamentosResponse.data;
      
      // 2. Buscar profissionais que prestam o serviço selecionado (otimizado com filtro de API)
      const profissionaisDoServico = await getProfissionaisServicos({ 
        servicoId: servicoSelecionado.id 
      });
      
      // 3. Buscar disponibilidades dos profissionais
      const disponibilidades = await getAllDisponibilidades();
      
      // 4. Buscar dados de ocupação (próximos 7 dias)
      const dadosOcupacaoCompletos = await getDadosOcupacao();
      setDadosOcupacao(dadosOcupacaoCompletos.ocupacoesProfissionais);
      
      
      // 4. Gerar slots disponíveis
      const slots: SlotDisponivel[] = [];
      const diaSemanaAPI = parseInt(diaSelecionado.id); // 1-6 (API: Segunda=1, Terça=2, etc.)
      const tipoAtendimento = tipoAgendamentoSelecionado.id as 'presencial' | 'online';
      
      
      // Para os próximos 30 dias
      for (let dias = 0; dias < 30; dias++) {
        const dataAtual = new Date(hoje);
        dataAtual.setDate(hoje.getDate() + dias);
        const diaSemanaJS = dataAtual.getDay(); // 0=Domingo, 1=Segunda, etc.
        
        // Converter JavaScript day para API day (JS: 1=Segunda → API: 1=Segunda)
        // JavaScript: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
        // API:        x    , 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
        const diaSemanaAPICorrespondente = diaSemanaJS === 0 ? 7 : diaSemanaJS; // Domingo=7 (se necessário), outros iguais
        
        // Verifica se é o dia da semana selecionado
        if (diaSemanaAPICorrespondente !== diaSemanaAPI) continue;
        
        // Gerar string da data no formato local (sem UTC)
        const ano = dataAtual.getFullYear();
        const mes = (dataAtual.getMonth() + 1).toString().padStart(2, '0');
        const dia = dataAtual.getDate().toString().padStart(2, '0');
        const dataStr = `${ano}-${mes}-${dia}`;
        
        
        // Para cada profissional que presta o serviço
        for (const profServico of profissionaisDoServico) {
          // Buscar disponibilidades do profissional para este dia específico
          const disponibilidadesDoProfissional = disponibilidades.filter(disp => {
            const mesmoProf = disp.profissionalId === profServico.profissionalId;
            const mesmoTipo = disp.tipo === tipoAtendimento;
            
            // Verificar se é disponibilidade semanal para este dia OU data específica
            const temDisponibilidadeSemanal = disp.diaSemana === diaSemanaAPI;
            const temDataEspecifica = disp.dataEspecifica && 
              disp.dataEspecifica.toISOString().split('T')[0] === dataStr;
            
            const disponivel = mesmoProf && mesmoTipo && (temDisponibilidadeSemanal || temDataEspecifica);
            
            // Disponibilidade verificada
            
            return disponivel;
          });
          
          // Se não tem disponibilidade cadastrada para este dia, pula
          if (disponibilidadesDoProfissional.length === 0) {
            continue;
          }
          
          for (const disponibilidade of disponibilidadesDoProfissional) {
            // Gerar slots de horário baseado na duração do serviço
            const inicio = new Date(disponibilidade.horaInicio);
            const fim = new Date(disponibilidade.horaFim);
            const duracaoServico = profServico.servico.duracaoMinutos;
            
            // Filtrar por período
            const horaInicioNum = inicio.getHours();
            let incluirHorario = false;
            
            switch (periodoSelecionado.id) {
              case 'manha':
                incluirHorario = horaInicioNum >= 6 && horaInicioNum < 12;
                break;
              case 'tarde':
                incluirHorario = horaInicioNum >= 12 && horaInicioNum < 17;
                break;
              case 'noite':
                incluirHorario = horaInicioNum >= 17 && horaInicioNum <= 22;
                break;
            }
            
            if (!incluirHorario) continue;
            
            // Gerar slots de horários
            let horaAtual = new Date(inicio);
            while (horaAtual.getTime() + (duracaoServico * 60000) <= fim.getTime()) {
              const horaSlot = `${horaAtual.getHours().toString().padStart(2, '0')}:${horaAtual.getMinutes().toString().padStart(2, '0')}`;
              const fimSlot = new Date(horaAtual.getTime() + (duracaoServico * 60000));
              
              // Verificar se já existe agendamento neste horário (considerando sobreposição)
              const temAgendamento = agendamentos.some(ag => {
                // Só verificar agendamentos não cancelados do mesmo profissional
                if (ag.profissionalId !== profServico.profissionalId || ag.status === 'CANCELADO') {
                  return false;
                }

                // Parse da string de data da API corrigindo timezone
                // O backend salva em UTC mas representa horário local BRT (-03:00)
                // Converter UTC para horário local do Brasil
                const dataAgendamento = new Date(ag.dataHoraInicio);

                // Converter para horário local brasileiro
                const dataAgendamentoLocal = new Date(dataAgendamento.getTime() - (3 * 60 * 60 * 1000));

                const anoAg = dataAgendamentoLocal.getUTCFullYear();
                const mesAg = (dataAgendamentoLocal.getUTCMonth() + 1).toString().padStart(2, '0');
                const diaAg = dataAgendamentoLocal.getUTCDate().toString().padStart(2, '0');
                const dataAgendamentoStr = `${anoAg}-${mesAg}-${diaAg}`;

                // Verificar se é a mesma data
                if (dataAgendamentoStr !== dataStr) {
                  return false;
                }

                // Extrair horário em horário local
                const horaAgLocal = dataAgendamentoLocal.getUTCHours();
                const minutoAgLocal = dataAgendamentoLocal.getUTCMinutes();
                const inicioAgendamento = horaAgLocal * 60 + minutoAgLocal; // em minutos

                // Calcular fim do agendamento (usar dataHoraFim se disponível, senão assumir 60 min)
                let fimAgendamento = inicioAgendamento + 60; // padrão 60 min
                if (ag.dataHoraFim) {
                  const dataFimAgendamento = new Date(ag.dataHoraFim);
                  const dataFimAgendamentoLocal = new Date(dataFimAgendamento.getTime() - (3 * 60 * 60 * 1000));
                  const horaFimLocal = dataFimAgendamentoLocal.getUTCHours();
                  const minutoFimLocal = dataFimAgendamentoLocal.getUTCMinutes();
                  fimAgendamento = horaFimLocal * 60 + minutoFimLocal;
                }

                // Converter horário do slot atual para minutos
                const inicioSlot = horaAtual.getHours() * 60 + horaAtual.getMinutes();
                const fimSlot = inicioSlot + duracaoServico;

                // Verificar sobreposição: slots se sobrepõem se um começar antes do outro terminar
                const temSobreposicao = inicioSlot < fimAgendamento && fimSlot > inicioAgendamento;

                return temSobreposicao;
              });
              
              if (!temAgendamento) {
                // Buscar dados de ocupação do profissional
                const ocupacaoProfissional = dadosOcupacaoCompletos.ocupacoesProfissionais.find(
                  ocp => ocp.profissionalId === profServico.profissionalId
                );
                
                // Slot disponível encontrado
                
                slots.push({
                  profissionalId: profServico.profissionalId,
                  profissionalNome: profServico.profissional.nome,
                  data: dataStr,
                  hora: horaSlot,
                  tipo: tipoAtendimento,
                  servicoId: profServico.servicoId,
                  servicoNome: profServico.servico.nome,
                  duracaoMinutos: duracaoServico,
                  // Dados de ocupação (próximos 7 dias)
                  ocupados: ocupacaoProfissional?.ocupados || 0,
                  total: ocupacaoProfissional?.total || 0,
                  percentual: ocupacaoProfissional?.percentual || 0,
                  agendamentosHoje: ocupacaoProfissional?.agendamentosHoje || 0,
                  agendamentosProximos7: ocupacaoProfissional?.agendamentosProximos7 || 0
                });
              }
              
              // Próximo slot (intervalo de 30 minutos)
              horaAtual.setMinutes(horaAtual.getMinutes() + 30);
            }
          }
        }
      }
      
      // Ordenar slots por data e hora
      slots.sort((a, b) => {
        const dataA = new Date(`${a.data}T${a.hora}:00`);
        const dataB = new Date(`${b.data}T${b.hora}:00`);
        return dataA.getTime() - dataB.getTime();
      });
      
      setSlotsDisponiveis(slots);
      
    } catch (error) {
      console.error('Erro ao verificar agenda:', error);
      setErro('Erro ao verificar disponibilidade da agenda. Tente novamente.');
    } finally {
      setCarregandoVerificacao(false);
    }
  };

  const carregarServicos = async () => {
    try {
      setCarregandoServicos(true);
      const dados = await getServicos();
      setServicos(dados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })));
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    } finally {
      setCarregandoServicos(false);
    }
  };

  // Funções do modal de agendamento
  const handleFecharAgendamentoModal = () => {
    setShowAgendamentoModal(false);
    setPreenchimentoInicialModal(undefined);
  };

  const handleSuccessAgendamento = () => {
    // Recarregar dados após criar agendamento
    verificarAgenda();
    handleFecharAgendamentoModal();
  };

  const handleAgendar = (slot: SlotDisponivel) => {
    // Formatar data e hora para o formato esperado pelo modal
    const dataHoraCombinada = new Date(`${slot.data}T${slot.hora}:00`);
    
    // Formatar para datetime-local sem conversão de timezone
    const ano = dataHoraCombinada.getFullYear();
    const mes = (dataHoraCombinada.getMonth() + 1).toString().padStart(2, '0');
    const dia = dataHoraCombinada.getDate().toString().padStart(2, '0');
    const horaFormatada = dataHoraCombinada.getHours().toString().padStart(2, '0');
    const minutoFormatado = dataHoraCombinada.getMinutes().toString().padStart(2, '0');
    
    const dataHoraLocal = `${ano}-${mes}-${dia}T${horaFormatada}:${minutoFormatado}`;
    
    // Dados para pré-preenchimento do formulário
    const dadosFormulario = {
      profissionalId: slot.profissionalId,
      dataHoraInicio: dataHoraLocal,
      servicoId: slot.servicoId,
      tipoFluxo: 'por-profissional' as const
    };
    
    setPreenchimentoInicialModal(dadosFormulario);
    setShowAgendamentoModal(true);
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
          <p className="text-gray-600">Carregando dados de verificação de agenda...</p>
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
              <CalendarCheck className="w-8 h-8 text-emerald-600" />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Verificar Agenda
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
                  onClick={() => setSlotsDisponiveis([])} 
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
              <CalendarCheck className="w-8 h-8 text-emerald-600" />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Verificar Agenda
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar profissional ou serviço..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            
          </div>
        </div>
      </div>

      {/* Formulário de Filtros */}
      <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-b border-gray-200">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5 text-emerald-600" />
              Filtros de Verificação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="servico">Serviço</Label>
                <SingleSelectDropdown
                  options={servicos.map(s => ({ id: s.id, nome: s.nome }))}
                  selected={servicoSelecionado}
                  onChange={setServicoSelecionado}
                  placeholder={carregandoServicos ? "Carregando..." : "Selecione um serviço"}
                  headerText="Serviços disponíveis"
                  dotColor="emerald"
                  disabled={carregandoServicos}
                />
              </div>
              
              <div>
                <Label htmlFor="diaSemana">Dia da Semana</Label>
                <SingleSelectDropdown
                  options={DIAS_SEMANA}
                  selected={diaSelecionado}
                  onChange={setDiaSelecionado}
                  placeholder="Selecione um dia"
                  headerText="Dias da semana"
                  dotColor="blue"
                />
              </div>
              
              <div>
                <Label htmlFor="periodo">Período</Label>
                <SingleSelectDropdown
                  options={PERIODOS}
                  selected={periodoSelecionado}
                  onChange={setPeriodoSelecionado}
                  placeholder="Selecione um período"
                  headerText="Períodos do dia"
                  dotColor="purple"
                />
              </div>
              
              <div>
                <Label htmlFor="tipoAgendamento">Tipo Agendamento</Label>
                <SingleSelectDropdown
                  options={TIPOS_AGENDAMENTO}
                  selected={tipoAgendamentoSelecionado}
                  onChange={setTipoAgendamentoSelecionado}
                  placeholder="Selecione o tipo"
                  headerText="Tipos de agendamento"
                  dotColor="orange"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setServicoSelecionado(null);
                  setDiaSelecionado(null);
                  setPeriodoSelecionado(null);
                  setTipoAgendamentoSelecionado(null);
                }}
              >
                Limpar Filtros
              </Button>
              <Button 
                onClick={verificarAgenda}
                disabled={carregandoVerificacao || !servicoSelecionado || !diaSelecionado || !periodoSelecionado || !tipoAgendamentoSelecionado}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300"
              >
                {carregandoVerificacao ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar Agenda'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo com scroll independente */}
      <div className="flex-1 overflow-y-auto pt-2 pl-6 pr-6">
        <div className="mb-6">
          {renderContent()}
        </div>
      </div>

      {/* Footer fixo na parte de baixo */}
      {slotsFiltrados.length > 0 && (
        <div className="flex-shrink-0">
          <ResponsivePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={slotsFiltrados.length}
            itemsPerPage={itemsPerPage}
            module="verificar-agenda"
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      )}

      {/* Modal de Agendamento */}
      <AgendamentoModal
        isOpen={showAgendamentoModal}
        onClose={handleFecharAgendamentoModal}
        onSuccess={handleSuccessAgendamento}
        preenchimentoInicial={preenchimentoInicialModal}
      />
    </div>
  );

  function renderContent() {
    if (slotsDisponiveis.length === 0 && !carregandoVerificacao) {
      return (
        <div className="text-center py-12">
          <CalendarCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Preencha os filtros e clique em "Verificar Agenda" para ver os horários disponíveis</p>
        </div>
      );
    }

    return renderTableView();
  }

  function renderTableView() {
    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-emerald-600" />
                    Profissional
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Data
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    Hora
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    Ocupação
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Percentual
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Agendamentos
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-emerald-600" />
                    Ações
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <CalendarCheck className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">
                        {busca 
                          ? 'Nenhum horário encontrado para os filtros aplicados' 
                          : 'Nenhum horário disponível encontrado'
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((slot: SlotDisponivel, index: number) => {
                  // Formatear data para exibição (evitando problemas de UTC)
                  const [ano, mes, dia] = slot.data.split('-');
                  const dataFormatada = `${dia}/${mes}/${ano}`;
                  
                  // Criar data local para obter dia da semana correto
                  const dataLocal = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
                  const diaSemana = dataLocal.toLocaleDateString('pt-BR', { weekday: 'short' });
                  
                  return (
                    <tr key={`${slot.profissionalId}-${slot.data}-${slot.hora}-${index}`} className="hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all duration-200">
                      <td className="px-6 py-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 bg-gradient-to-r ${getAvatarGradient(
                            slot.profissionalNome, 
                            'profissional'
                          )} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                            {slot.profissionalNome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-900">{slot.profissionalNome}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-medium text-gray-900">{dataFormatada}</span>
                          <span className="text-xs text-gray-500 capitalize">{diaSemana}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-medium text-gray-900">{slot.hora}</span>
                          <span className="text-xs text-gray-500">{slot.duracaoMinutos}min</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">
                            {slot.ocupados}/{slot.total}
                          </div>
                          <Progress 
                            value={slot.percentual} 
                            className="h-2 w-24 mx-auto" 
                          />
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <Badge className={`${getOcupacaoColor(slot.percentual).bg} ${getOcupacaoColor(slot.percentual).text}`}>
                          {slot.percentual}%
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="text-sm">
                          Hoje: <span className="font-medium">{slot.agendamentosHoje}</span> | 7 dias: <span className="font-medium">{slot.agendamentosProximos7}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <Button
                          size="sm"
                          onClick={() => handleAgendar(slot)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CalendarCheck className="w-3 h-3 mr-1" />
                          Agendar
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

};