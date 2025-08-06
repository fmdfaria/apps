import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimeSelectDropdown } from '@/components/ui/time-select-dropdown';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { useToast } from '@/components/ui/use-toast';
import { Calendar as CalendarIcon, Clock, User, Save, RotateCcw, Info, CalendarDays, Trash2 } from 'lucide-react';
import DiaHorarioCard from '@/components/profissionais/DiaHorarioCard';
import { getProfissionais } from '@/services/profissionais';
import { getDisponibilidadesProfissional, createDisponibilidade, updateDisponibilidade, deleteDisponibilidade } from '@/services/disponibilidades';
import type { Profissional } from '@/types/Profissional';
import type { HorarioSemana, CreateDisponibilidadeDto } from '@/types/DisponibilidadeProfissional';
import { criarHorarioSemanaPadrao, converterDisponibilidadesParaHorarios, gerarHorarioParaAPI, compararHorarios } from '@/lib/horarios-utils';
import { parseDataLocal, formatarDataLocal } from '@/lib/utils';

// Gerar opções de horário para início (06:00 até 21:00)
const gerarOpcoesHorarioInicio = () => {
  const opcoes = [];
  for (let hora = 6; hora <= 21; hora++) {
    for (let minuto = 0; minuto < 60; minuto += 30) {
      if (hora === 21 && minuto > 0) break; // Para às 21:00
      const horarioFormatado = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
      opcoes.push({
        id: horarioFormatado,
        nome: horarioFormatado
      });
    }
  }
  return opcoes;
};

// Gerar opções de horário para fim (06:30 até 21:30)
const gerarOpcoesHorarioFim = () => {
  const opcoes = [];
  for (let hora = 6; hora <= 21; hora++) {
    for (let minuto = 0; minuto < 60; minuto += 30) {
      if (hora === 6 && minuto === 0) continue; // Começa às 06:30
      const horarioFormatado = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
      opcoes.push({
        id: horarioFormatado,
        nome: horarioFormatado
      });
    }
  }
  return opcoes;
};

// Função para calcular horário 30 minutos depois
const calcularHorario30MinDepois = (horario: string): string => {
  const [hora, minuto] = horario.split(':').map(Number);
  let novaHora = hora;
  let novoMinuto = minuto + 30;
  
  if (novoMinuto >= 60) {
    novoMinuto = 0;
    novaHora += 1;
  }
  
  // Se passar de 23:59, volta para 00:00
  if (novaHora >= 24) {
    novaHora = 0;
  }
  
  return `${novaHora.toString().padStart(2, '0')}:${novoMinuto.toString().padStart(2, '0')}`;
};

// Função para filtrar opções de horário fim baseado no horário início
const filtrarOpcoesHorarioFim = (horarioInicio: string | null): {id: string, nome: string}[] => {
  if (!horarioInicio) return OPCOES_HORARIO_FIM;
  
  const [horaInicio, minutoInicio] = horarioInicio.split(':').map(Number);
  const minutosInicio = horaInicio * 60 + minutoInicio;
  
  return OPCOES_HORARIO_FIM.filter(opcao => {
    const [hora, minuto] = opcao.nome.split(':').map(Number);
    const minutosOpcao = hora * 60 + minuto;
    
    // Permitir apenas horários que sejam depois do início
    return minutosOpcao > minutosInicio;
  });
};

const OPCOES_HORARIO_INICIO = gerarOpcoesHorarioInicio();
const OPCOES_HORARIO_FIM = gerarOpcoesHorarioFim();

export default function DisponibilidadeProfissionaisPage() {
  const { toast } = useToast();
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<Profissional | null>(null);
  const [tipoEdicao, setTipoEdicao] = useState<'disponivel' | 'folga'>('disponivel');
  const [abaSelecionada, setAbaSelecionada] = useState<'semanal' | 'data-especifica'>('semanal');
  const [horariosSemana, setHorariosSemana] = useState<HorarioSemana[]>(criarHorarioSemanaPadrao());
  const [horariosOriginais, setHorariosOriginais] = useState<HorarioSemana[]>(criarHorarioSemanaPadrao());
  
  // Estados para data específica
  const [dataEspecifica, setDataEspecifica] = useState('');
  const [horaInicioEspecifica, setHoraInicioEspecifica] = useState('07:00');
  const [horaFimEspecifica, setHoraFimEspecifica] = useState('20:30');
  const [observacaoEspecifica, setObservacaoEspecifica] = useState('');
  const [disponibilidadesEspecificas, setDisponibilidadesEspecificas] = useState<any[]>([]);
  
  // Estados para os dropdowns de horário na data específica
  const [horarioInicioEspecificoSelecionado, setHorarioInicioEspecificoSelecionado] = useState<{id: string, nome: string} | null>(
    OPCOES_HORARIO_INICIO.find(op => op.nome === '07:00') || null
  );
  const [horarioFimEspecificoSelecionado, setHorarioFimEspecificoSelecionado] = useState<{id: string, nome: string} | null>(
    OPCOES_HORARIO_FIM.find(op => op.nome === '20:30') || null
  );
  
  // Estados para modal de confirmação de exclusão
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [disponibilidadeParaExcluir, setDisponibilidadeParaExcluir] = useState<any>(null);
  
  // Estados para modal de confirmação de reset
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Estados para modal de confirmação de limpar horários
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [carregandoDisponibilidades, setCarregandoDisponibilidades] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarProfissionais();
  }, []);

  useEffect(() => {
    if (profissionalSelecionado) {
      carregarDisponibilidades();
    } else {
      // Limpar dados quando nenhum profissional está selecionado
      limparDadosComAba();
    }
  }, [profissionalSelecionado]);

  const carregarProfissionais = async () => {
    setLoading(true);
    try {
      const data = await getProfissionais();
      // Ordenar profissionais por ordem alfabética
      const profissionaisOrdenados = data.sort((a, b) => 
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      );
      setProfissionais(profissionaisOrdenados);
    } catch (err) {
      toast({
        title: "Erro ao carregar",
        description: "Erro ao carregar profissionais",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const limparDados = () => {
    // Resetar todos os dados para o estado inicial
    const horariosVazios = criarHorarioSemanaPadrao();
    setHorariosSemana(horariosVazios);
    setHorariosOriginais(JSON.parse(JSON.stringify(horariosVazios)));
    setDisponibilidadesEspecificas([]);
    
    // Limpar formulário de data específica
    setDataEspecifica('');
    setHoraInicioEspecifica('07:00');
    setHoraFimEspecifica('20:30');
    setObservacaoEspecifica('');
    
    // Resetar dropdowns de horário para valores padrão
    setHorarioInicioEspecificoSelecionado(OPCOES_HORARIO_INICIO.find(op => op.nome === '07:00') || null);
    setHorarioFimEspecificoSelecionado(OPCOES_HORARIO_FIM.find(op => op.nome === '20:30') || null);
  };

  const limparDadosComAba = () => {
    limparDados();
    // Resetar aba para semanal apenas quando necessário (troca de profissional)
    setAbaSelecionada('semanal');
  };

  const carregarDisponibilidades = async () => {
    if (!profissionalSelecionado) return;
    
    setCarregandoDisponibilidades(true);
    
    // Limpar dados imediatamente para evitar exibir dados do profissional anterior
    // Preservar a aba atual selecionada
    const abaAtual = abaSelecionada;
    limparDados();
    
    try {
      const disponibilidades = await getDisponibilidadesProfissional(profissionalSelecionado.id);
      
      // Separar disponibilidades semanais das específicas
      const disponibilidadesSemanais = disponibilidades.filter(d => d.diaSemana !== null && !d.dataEspecifica);
      const disponibilidadesEspecificas = disponibilidades.filter(d => d.dataEspecifica !== null);
      
      const horariosConvertidos = converterDisponibilidadesParaHorarios(disponibilidadesSemanais);
      setHorariosSemana(horariosConvertidos);
      setHorariosOriginais(JSON.parse(JSON.stringify(horariosConvertidos))); // Deep copy
      setDisponibilidadesEspecificas(disponibilidadesEspecificas);
      
      // Restaurar aba selecionada
      setAbaSelecionada(abaAtual);
    } catch (err) {
      console.error('Erro ao carregar disponibilidades:', err);
      // Se não há disponibilidades, usar padrão
      const horariosVazios = criarHorarioSemanaPadrao();
      setHorariosSemana(horariosVazios);
      setHorariosOriginais(JSON.parse(JSON.stringify(horariosVazios))); // Deep copy
      setDisponibilidadesEspecificas([]);
      
      // Restaurar aba selecionada
      setAbaSelecionada(abaAtual);
    } finally {
      setCarregandoDisponibilidades(false);
    }
  };

  const handleSelecionarProfissional = (profissional: {id: string, nome: string} | null) => {
    if (profissional) {
      const profissionalCompleto = profissionais.find(p => p.id === profissional.id);
      setProfissionalSelecionado(profissionalCompleto || null);
    } else {
      setProfissionalSelecionado(null);
    }
    // O useEffect já cuida de carregar as disponibilidades
  };

  const handleAlterarHorario = (horarioAtualizado: HorarioSemana) => {
    setHorariosSemana(horarios => 
      horarios.map(h => 
        h.diaSemana === horarioAtualizado.diaSemana ? horarioAtualizado : h
      )
    );
  };

  const handleResetarHorarios = () => {
    setShowResetConfirm(true);
  };

  const confirmarResetarHorarios = () => {
    const horariosReset = criarHorarioSemanaPadrao();
    setHorariosSemana(horariosReset);
    // Importante: Atualizar também os horários originais para que a comparação seja feita corretamente
    // Isso evita que o sistema tente excluir horários que não existem mais
    setHorariosOriginais(criarHorarioSemanaPadrao());
    setShowResetConfirm(false);
    toast({
      title: "Horários resetados na tela",
      description: "Padrão aplicado: Seg-Sex (07:00-12:00 disponível, 12:00-13:00 folga, 13:00-18:00 disponível). Ajuste se necessário e clique em 'Salvar Horários' para aplicar.",
    });
  };

  const handleLimparHorarios = () => {
    setShowClearConfirm(true);
  };

  const confirmarLimparHorarios = () => {
    const horariosVazios = horariosSemana.map(horario => ({
      ...horario,
      ativo: false,
      intervalos: []
    }));
    setHorariosSemana(horariosVazios);
    setShowClearConfirm(false);
    toast({
      title: "Horários limpos na tela",
      description: "Todos os horários foram removidos da tela. Clique em 'Salvar Horários' para aplicar as mudanças no sistema.",
    });
  };

  // Função para lidar com mudança no horário de início da data específica
  const handleHorarioInicioEspecificoChange = (novoHorario: {id: string, nome: string} | null) => {
    setHorarioInicioEspecificoSelecionado(novoHorario);
    
    if (novoHorario) {
      // Atualizar também o estado string para compatibilidade
      setHoraInicioEspecifica(novoHorario.nome);
      
      // Calcular horário de fim automático (30 min depois)
      const horarioFimAuto = calcularHorario30MinDepois(novoHorario.nome);
      const opcaoFimAuto = OPCOES_HORARIO_FIM.find(op => op.nome === horarioFimAuto);
      
      if (opcaoFimAuto) {
        setHorarioFimEspecificoSelecionado(opcaoFimAuto);
        setHoraFimEspecifica(opcaoFimAuto.nome);
      } else {
        // Se não encontrar a opção automática, selecionar a primeira opção válida
        const opcoesValidas = filtrarOpcoesHorarioFim(novoHorario.nome);
        if (opcoesValidas.length > 0) {
          setHorarioFimEspecificoSelecionado(opcoesValidas[0]);
          setHoraFimEspecifica(opcoesValidas[0].nome);
        } else {
          setHorarioFimEspecificoSelecionado(null);
          setHoraFimEspecifica('17:00');
        }
      }
    } else {
      setHoraInicioEspecifica('08:00');
      setHorarioFimEspecificoSelecionado(null);
      setHoraFimEspecifica('17:00');
    }
  };

  // Função para lidar com mudança no horário de fim da data específica
  const handleHorarioFimEspecificoChange = (novoHorario: {id: string, nome: string} | null) => {
    setHorarioFimEspecificoSelecionado(novoHorario);
    
    if (novoHorario) {
      setHoraFimEspecifica(novoHorario.nome);
    } else {
      setHoraFimEspecifica('17:00');
    }
  };

  const handleAdicionarDataEspecifica = async () => {
    if (!profissionalSelecionado || !dataEspecifica || !horarioInicioEspecificoSelecionado || !horarioFimEspecificoSelecionado) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (horarioInicioEspecificoSelecionado.nome >= horarioFimEspecificoSelecionado.nome) {
      toast({
        title: "Horário inválido",
        description: "Horário de início deve ser menor que o horário de fim",
        variant: "destructive",
      });
      return;
    }



    setSalvando(true);

    try {
      const dataCompleta = new Date(dataEspecifica);
      const [horaInicio, minutoInicio] = horarioInicioEspecificoSelecionado.nome.split(':').map(Number);
      const [horaFim, minutoFim] = horarioFimEspecificoSelecionado.nome.split(':').map(Number);

      const dataHoraInicio = new Date(dataCompleta);
      dataHoraInicio.setHours(horaInicio, minutoInicio, 0, 0);

      const dataHoraFim = new Date(dataCompleta);
      dataHoraFim.setHours(horaFim, minutoFim, 0, 0);

      const novaDisponibilidade: CreateDisponibilidadeDto = {
        profissionalId: profissionalSelecionado.id,
        horaInicio: dataHoraInicio.toISOString(),
        horaFim: dataHoraFim.toISOString(),
        tipo: tipoEdicao,
        diaSemana: null,
        dataEspecifica: dataCompleta.toISOString(),
        observacao: observacaoEspecifica || null
      };



      await createDisponibilidade(novaDisponibilidade);

      // Limpar formulário
      setDataEspecifica('');
      setHoraInicioEspecifica('08:00');
      setHoraFimEspecifica('17:00');
      setObservacaoEspecifica('');
      
      // Resetar dropdowns para valores padrão
      setHorarioInicioEspecificoSelecionado(OPCOES_HORARIO_INICIO.find(op => op.nome === '08:00') || null);
      setHorarioFimEspecificoSelecionado(OPCOES_HORARIO_FIM.find(op => op.nome === '17:00') || null);

      toast({
        title: "Sucesso!",
        description: "Disponibilidade específica adicionada com sucesso!",
      });
      await carregarDisponibilidades();

    } catch (err: any) {
      console.error('Erro ao adicionar:', err);
      
      // Tratar especificamente erro de sobreposição
      if (err?.response?.status === 409) {
        const errorMessage = err?.response?.data?.message || 'Conflito de horários';
        toast({
          title: "Conflito de horários",
          description: `${errorMessage}. Verifique se não há conflito com horários semanais ou outras datas específicas já configuradas.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao adicionar",
          description: err?.response?.data?.message || 'Erro ao adicionar disponibilidade',
          variant: "destructive",
        });
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleAbrirConfirmacaoExclusao = (disponibilidade: any) => {
    setDisponibilidadeParaExcluir(disponibilidade);
    setShowDeleteConfirm(true);
  };

  const handleExcluirDataEspecifica = async () => {
    if (!disponibilidadeParaExcluir) return;
    
    setSalvando(true);
    try {
      await deleteDisponibilidade(disponibilidadeParaExcluir.id);
      toast({
        title: "Removido com sucesso",
        description: "Disponibilidade específica removida com sucesso!",
      });
      await carregarDisponibilidades();
      setShowDeleteConfirm(false);
      setDisponibilidadeParaExcluir(null);
    } catch (err: any) {
      toast({
        title: "Erro ao remover",
        description: err?.response?.data?.message || 'Erro ao remover disponibilidade',
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const getDataAplicacao = (): Date => {
    return new Date();
  };

  const handleSalvar = async () => {
    if (!profissionalSelecionado) {
      toast({
        title: "Profissional não selecionado",
        description: "Selecione um profissional",
        variant: "destructive",
      });
      return;
    }

    setSalvando(true);

    try {
      const dataAplicacao = getDataAplicacao();

      // Comparar horários atuais com originais para detectar mudanças
      const { novos, removidos } = compararHorarios(horariosSemana, horariosOriginais);

      let operacoesRealizadas = 0;

      // 1. Remover intervalos deletados
      for (const intervalo of removidos) {
        if (intervalo.id && !intervalo.id.startsWith('temp-')) {
          await deleteDisponibilidade(intervalo.id);
          operacoesRealizadas++;
        }
      }

      // 2. Criar novos intervalos
      for (const intervalo of novos) {
        const novaDisponibilidade: CreateDisponibilidadeDto = {
          profissionalId: profissionalSelecionado.id,
          horaInicio: gerarHorarioParaAPI(dataAplicacao, intervalo.horaInicio),
          horaFim: gerarHorarioParaAPI(dataAplicacao, intervalo.horaFim),
          tipo: intervalo.tipo,
          diaSemana: (intervalo as any).diaSemana,
          observacao: intervalo.observacao || null
        };
        await createDisponibilidade(novaDisponibilidade);
        operacoesRealizadas++;
      }

      if (operacoesRealizadas === 0) {
        toast({
          title: "Nenhuma alteração detectada",
          description: "Não há mudanças para salvar nos horários semanais.",
        });
      } else {
        toast({
          title: "Horários salvos com eficiência!",
          description: `${operacoesRealizadas} operação(ões) realizadas: ${removidos.length} removidas, ${novos.length} criadas.`,
        });
      }
      
      // Recarregar para mostrar dados atualizados
      await carregarDisponibilidades();

    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      toast({
        title: "Erro ao salvar",
        description: err?.response?.data?.message || 'Erro ao salvar horários',
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const getResumoHorarios = () => {
    const diasAtivos = horariosSemana.filter(h => h.ativo).length;
    const totalIntervalos = horariosSemana.reduce((acc, h) => acc + h.intervalos.length, 0);
    const intervalosDisponiveis = horariosSemana.reduce((acc, h) => 
      acc + h.intervalos.filter(i => i.tipo === 'disponivel').length, 0
    );
    const intervalosFolga = horariosSemana.reduce((acc, h) => 
      acc + h.intervalos.filter(i => i.tipo === 'folga').length, 0
    );

    return { diasAtivos, totalIntervalos, intervalosDisponiveis, intervalosFolga };
  };

  const resumo = getResumoHorarios();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="w-8 h-8 text-blue-600" />
          Disponibilidades Profissionais
        </h1>
        <p className="text-gray-600 mt-2">
          Configure horários de trabalho e folgas dos profissionais
        </p>
      </div>

      {/* Configurações principais */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          {/* Layout de 3 colunas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Coluna 1: Profissional */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="w-4 h-4" />
                Profissional
              </div>
              <SingleSelectDropdown
                options={profissionais.map(p => ({ id: p.id, nome: p.nome }))}
                selected={profissionalSelecionado ? { id: profissionalSelecionado.id, nome: profissionalSelecionado.nome } : null}
                onChange={handleSelecionarProfissional}
                placeholder={loading ? "Carregando profissionais..." : "Selecione um profissional..."}
                headerText="Profissionais disponíveis"
                dotColor="green"
              />
            </div>

            {/* Coluna 2: Tipo de Horário */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock className="w-4 h-4" />
                Tipo de Horário
              </div>
              <Tabs value={tipoEdicao} onValueChange={(value: any) => setTipoEdicao(value)}>
                <TabsList className="grid w-full grid-cols-2 h-12">
                  <TabsTrigger value="disponivel" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
                    ✅ Disponível
                  </TabsTrigger>
                  <TabsTrigger value="folga" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
                    🚫 Folga
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Coluna 3: Dias Ativos (Disponíveis/Folgas) */}
            <div className="space-y-3 md:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <CalendarDays className="w-4 h-4" />
                Dias Ativos
              </div>
              {profissionalSelecionado ? (
                <div className="h-12 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                  <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
                        {resumo.diasAtivos} dias ativos
                      </span>
                    </div>
                    <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-1 sm:px-2 py-1 whitespace-nowrap">
                        {resumo.intervalosDisponiveis} disponíveis
                      </Badge>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-1 sm:px-2 py-1 whitespace-nowrap">
                        {resumo.intervalosFolga} folgas
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-12 p-3 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                  <span className="text-sm text-gray-500">Selecione um profissional</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas de configuração */}
      {profissionalSelecionado && (
        <Card className="mb-6">
          <CardContent className="p-0">
            <Tabs value={abaSelecionada} onValueChange={(value) => {
              setAbaSelecionada(value as 'semanal' | 'data-especifica');
            }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger 
                  value="semanal" 
                  className={`flex items-center gap-2 transition-colors duration-200 ${
                    tipoEdicao === 'disponivel' 
                      ? 'data-[state=active]:bg-green-100 data-[state=active]:text-green-700 data-[state=active]:border-green-300' 
                      : 'data-[state=active]:bg-red-100 data-[state=active]:text-red-700 data-[state=active]:border-red-300'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Horários Semanais
                </TabsTrigger>
                <TabsTrigger 
                  value="data-especifica" 
                  className={`flex items-center gap-2 transition-colors duration-200 ${
                    tipoEdicao === 'disponivel' 
                      ? 'data-[state=active]:bg-green-100 data-[state=active]:text-green-700 data-[state=active]:border-green-300' 
                      : 'data-[state=active]:bg-red-100 data-[state=active]:text-red-700 data-[state=active]:border-red-300'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  Data Específica
                </TabsTrigger>
              </TabsList>

              <TabsContent value="semanal" className="p-6">
                {carregandoDisponibilidades ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-gray-600">Carregando disponibilidades...</p>
                    </div>
                  </div>
                ) : (
                  <>
                {/* Grid de horários semanais */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
                  {horariosSemana.map(horario => (
                    <DiaHorarioCard
                      key={horario.diaSemana}
                      horario={horario}
                      tipoEdicao={tipoEdicao}
                      onChange={handleAlterarHorario}
                    />
                  ))}
                </div>

                {/* Ações para horários semanais */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handleResetarHorarios}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Resetar Horários
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={handleLimparHorarios}
                      className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                      Limpar Horários
                    </Button>
                  </div>

                  <Button
                    onClick={handleSalvar}
                        disabled={salvando || loading || carregandoDisponibilidades}
                    className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {salvando ? 'Salvando...' : 'Salvar Horários'}
                  </Button>
                </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="data-especifica" className="p-6">
                {carregandoDisponibilidades ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-gray-600">Carregando disponibilidades...</p>
                    </div>
                  </div>
                ) : (
                  <>
                {/* Informação sobre data específica */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Configurar Data Específica</h4>
                      <p className="text-sm text-blue-700">
                        Use esta aba para configurar disponibilidades ou folgas em datas específicas (feriados, férias, plantões especiais, etc.).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Formulário para data específica */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="dataEspecifica">Data *</Label>
                      <Input
                        id="dataEspecifica"
                        type="date"
                        value={dataEspecifica}
                        onChange={(e) => setDataEspecifica(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label htmlFor="horaInicio">Hora Início *</Label>
                      <TimeSelectDropdown
                        options={OPCOES_HORARIO_INICIO}
                        selected={horarioInicioEspecificoSelecionado}
                        onChange={handleHorarioInicioEspecificoChange}
                        placeholder="Horário de início"
                        headerText="Horário de início"
                      />
                    </div>
                    <div>
                      <Label htmlFor="horaFim">Hora Fim *</Label>
                      <TimeSelectDropdown
                        options={filtrarOpcoesHorarioFim(horarioInicioEspecificoSelecionado?.nome || null)}
                        selected={horarioFimEspecificoSelecionado}
                        onChange={handleHorarioFimEspecificoChange}
                        placeholder="Horário de fim"
                        headerText="Horário de fim"
                      />
                    </div>
                    <div>
                      <Label className="invisible">Ação</Label>
                      <Button
                        onClick={handleAdicionarDataEspecifica}
                        disabled={salvando || !dataEspecifica || !horarioInicioEspecificoSelecionado || !horarioFimEspecificoSelecionado}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {salvando ? 'Adicionando...' : 'Adicionar'}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="observacao">Observação</Label>
                    <Input
                      id="observacao"
                      placeholder="Ex: Plantão especial, Feriado, Férias..."
                      value={observacaoEspecifica}
                      onChange={(e) => setObservacaoEspecifica(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Lista de disponibilidades específicas */}
                  {disponibilidadesEspecificas.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Disponibilidades Configuradas</h3>
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          {disponibilidadesEspecificas.length} configuração{disponibilidadesEspecificas.length !== 1 ? 'ões' : ''}
                        </Badge>
                      </div>
                      <div className="grid gap-3">
                        {disponibilidadesEspecificas
                          .sort((a, b) => {
                            // Corrigir ordenação considerando fuso horário
                            const dataLocalA = parseDataLocal(a.dataEspecifica!);
                            const dataLocalB = parseDataLocal(b.dataEspecifica!);
                            return dataLocalA.getTime() - dataLocalB.getTime();
                          })
                          .map((disp) => {
                            // Formatar data corrigindo problema de fuso horário
                            const dataFormatada = formatarDataLocal(disp.dataEspecifica!, {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            });

                            return (
                              <div
                                key={disp.id}
                                className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md hover:scale-[1.01] group ${
                                  disp.tipo === 'disponivel'
                                    ? 'border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300'
                                    : 'border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300'
                                }`}
                              >
                                                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                  disp.tipo === 'disponivel' ? 'bg-green-500' : 'bg-red-500'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="font-medium text-gray-900 capitalize">
                                      {dataFormatada}
                                    </span>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs flex-shrink-0 ${
                                        disp.tipo === 'disponivel' 
                                          ? 'border-green-300 text-green-700 bg-green-100' 
                                          : 'border-red-300 text-red-700 bg-red-100'
                                      }`}
                                    >
                                      {disp.tipo === 'disponivel' ? '✅ Disponível' : '🚫 Folga'}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-600 flex items-center gap-1">
                                    <Clock className="w-3 h-3 flex-shrink-0" />
                                    <span>
                                      {new Date(disp.horaInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {' '}
                                      {new Date(disp.horaFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  {disp.observacao && (
                                    <div className="text-sm text-gray-500 mt-1 italic">
                                      📝 {disp.observacao}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAbrirConfirmacaoExclusao(disp)}
                                  className="text-red-600 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:bg-transparent disabled:hover:text-red-600 disabled:hover:border-red-200 disabled:hover:shadow-none group-hover:shadow-md"
                                  disabled={salvando}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Remover
                                </Button>
                              </div>
                            </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {disponibilidadesEspecificas.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Nenhuma data específica configurada ainda.</p>
                      <p className="text-sm mt-1">Use o formulário acima para adicionar disponibilidades em datas específicas.</p>
                    </div>
                  )}
                </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {!profissionalSelecionado && (
        <Alert className="mb-6">
          <Info className="w-4 h-4" />
          <AlertDescription>
            Selecione um profissional para configurar seus horários de trabalho
          </AlertDescription>
        </Alert>
      )}

      {/* Modal de confirmação para reset de horários */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar reset dos horários</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja resetar todos os horários para o padrão?
              <br /><br />
              <strong>Padrão aplicado:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• <strong>Segunda a Sexta:</strong></li>
                <li className="ml-4">- 07:00 às 12:00 (Disponível)</li>
                <li className="ml-4">- 12:00 às 13:00 (Folga - Almoço)</li>
                <li className="ml-4">- 13:00 às 18:00 (Disponível)</li>
                <li>• <strong>Sábado e Domingo:</strong> Sem horários configurados</li>
              </ul>
              <br />
              <span className="text-blue-600 font-medium">
                Esta ação irá resetar os horários na tela. Você poderá ajustar conforme necessário e depois clicar em "Salvar Horários" para aplicar as mudanças.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowResetConfirm(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarResetarHorarios}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirmar Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de confirmação para limpar horários */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar limpeza dos horários</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja limpar <strong>todos os horários semanais</strong>?
              <br /><br />
              <span className="text-red-600 font-medium">
                ⚠️ Esta ação irá remover todos os intervalos de horários de todos os dias da semana.
              </span>
              <br /><br />
              <span className="text-blue-600 font-medium">
                Os horários serão removidos apenas da tela. Você precisará clicar em "Salvar Horários" para aplicar as mudanças no sistema.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowClearConfirm(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarLimparHorarios}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar Limpeza
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de confirmação para exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta configuração de{' '}
              <strong>
                {disponibilidadeParaExcluir?.tipo === 'disponivel' ? 'disponibilidade' : 'folga'}
              </strong>
              {disponibilidadeParaExcluir?.dataEspecifica && (
                <>
                  {' '}do dia{' '}
                  <strong>
                    {disponibilidadeParaExcluir.dataEspecifica.toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </strong>
                </>
              )}
              ?<br />
              <span className="text-destructive font-medium">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowDeleteConfirm(false);
                setDisponibilidadeParaExcluir(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirDataEspecifica}
              disabled={salvando}
              className="bg-destructive hover:bg-destructive/90"
            >
              {salvando ? 'Removendo...' : 'Excluir Configuração'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 