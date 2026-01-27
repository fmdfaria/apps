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
import { AppToast } from '@/services/toast';
import { Calendar as CalendarIcon, Clock, User, Save, Info, CalendarDays, Trash2 } from 'lucide-react';
import DiaHorarioCard from '@/components/profissionais/DiaHorarioCard';
import { getProfissionais } from '@/services/profissionais';
import { getRecursos } from '@/services/recursos';
import { getDisponibilidadesProfissional, createDisponibilidade, updateDisponibilidade, deleteDisponibilidade } from '@/services/disponibilidades';
import type { Profissional } from '@/types/Profissional';
import type { Recurso } from '@/types/Recurso';
import type { HorarioSemana, CreateDisponibilidadeDto } from '@/types/DisponibilidadeProfissional';
import { criarHorarioSemanaPadrao, converterDisponibilidadesParaHorarios, gerarHorarioParaAPI, compararHorarios } from '@/lib/horarios-utils';
import { formatDateOnly } from '@/lib/utils';
import { parseDataLocal, formatarDataLocal } from '@/lib/utils';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import { useAuth } from '@/hooks/useAuth';

// Gerar opções de horário para início (06:00 até 22:00 - atualizado)
const gerarOpcoesHorarioInicio = () => {
  const opcoes = [];
  // Intervalo atualizado: 06:00 até 22:00
  for (let hora = 6; hora <= 22; hora++) {
    for (let minuto = 0; minuto < 60; minuto += 30) {
      if (hora === 22 && minuto > 0) break; // Para às 22:00
      const horarioFormatado = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
      opcoes.push({
        id: horarioFormatado,
        nome: horarioFormatado
      });
    }
  }
  return opcoes;
};

// Gerar opções de horário para fim (06:30 até 22:30 - atualizado)
const gerarOpcoesHorarioFim = () => {
  const opcoes = [];
  // Intervalo atualizado: 06:30 até 22:30
  for (let hora = 6; hora <= 22; hora++) {
    for (let minuto = 0; minuto < 60; minuto += 30) {
      if (hora === 6 && minuto === 0) continue; // Pula 06:00, começa em 06:30
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

// Debug: Verificar horários gerados
console.log('🕐 Horários de INÍCIO:', OPCOES_HORARIO_INICIO.length, 'opções', '- Primeiro:', OPCOES_HORARIO_INICIO[0]?.nome, '- Último:', OPCOES_HORARIO_INICIO[OPCOES_HORARIO_INICIO.length - 1]?.nome);
console.log('🕐 Horários de FIM:', OPCOES_HORARIO_FIM.length, 'opções', '- Primeiro:', OPCOES_HORARIO_FIM[0]?.nome, '- Último:', OPCOES_HORARIO_FIM[OPCOES_HORARIO_FIM.length - 1]?.nome);

export default function DisponibilidadeProfissionaisPage() {
  const { user } = useAuth();
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<Profissional | null>(null);
  const [profissionalBloqueado, setProfissionalBloqueado] = useState(false);
  const [recursoSelecionado, setRecursoSelecionado] = useState<Recurso | null>(null);
  const [tipoEdicao, setTipoEdicao] = useState<'presencial' | 'online' | 'folga'>('presencial');
  const [abaSelecionada, setAbaSelecionada] = useState<'semanal' | 'data-especifica'>('semanal');
  const [horariosSemana, setHorariosSemana] = useState<HorarioSemana[]>(criarHorarioSemanaPadrao());
  const [horariosOriginais, setHorariosOriginais] = useState<HorarioSemana[]>(criarHorarioSemanaPadrao());
  
  // Estados para controle de permissões RBAC
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [canRead, setCanRead] = useState(true);
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [canEditHorariosSemanais, setCanEditHorariosSemanais] = useState(false);
  
  // Estados para data específica
  const [dataEspecifica, setDataEspecifica] = useState('');
  const [horaInicioEspecifica, setHoraInicioEspecifica] = useState('06:00');
  const [horaFimEspecifica, setHoraFimEspecifica] = useState('22:30');
  const [observacaoEspecifica, setObservacaoEspecifica] = useState('');
  const [disponibilidadesEspecificas, setDisponibilidadesEspecificas] = useState<any[]>([]);

  // Estados para os dropdowns de horário na data específica
  const [horarioInicioEspecificoSelecionado, setHorarioInicioEspecificoSelecionado] = useState<{id: string, nome: string} | null>(
    OPCOES_HORARIO_INICIO.find(op => op.nome === '06:00') || null
  );
  const [horarioFimEspecificoSelecionado, setHorarioFimEspecificoSelecionado] = useState<{id: string, nome: string} | null>(
    OPCOES_HORARIO_FIM.find(op => op.nome === '22:30') || null
  );
  
  // Estados para modal de confirmação de exclusão
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [disponibilidadeParaExcluir, setDisponibilidadeParaExcluir] = useState<any>(null);
  
  
  // Estados para modal de confirmação de limpar horários
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [carregandoDisponibilidades, setCarregandoDisponibilidades] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    checkPermissions();
    carregarProfissionais();
    carregarRecursos();
    
    // Se o usuário logado for PROFISSIONAL, bloquear o campo desde o início
    if (user?.roles?.includes('PROFISSIONAL') && user?.profissionalId) {
      setProfissionalBloqueado(true);
    }
  }, []);

  useEffect(() => {
    if (profissionalSelecionado) {
      carregarDisponibilidades();
    } else {
      // Limpar dados quando nenhum profissional está selecionado
      limparDadosComAba();
    }
  }, [profissionalSelecionado]);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar cada permissão específica para disponibilidades profissionais
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/disponibilidades-profissionais' && route.method.toLowerCase() === 'get';
      });
      
      const canCreate = allowedRoutes.some((route: any) => {
        return route.path === '/disponibilidades-profissionais' && route.method.toLowerCase() === 'post';
      });
      
      const canUpdate = allowedRoutes.some((route: any) => {
        return route.path === '/disponibilidades-profissionais/:id' && route.method.toLowerCase() === 'put';
      });
      
      const canDelete = allowedRoutes.some((route: any) => {
        return route.path === '/disponibilidades-profissionais/:id' && route.method.toLowerCase() === 'delete';
      });
      
      // Verificar permissão específica para editar horários semanais
      const canEditHorariosSemanais = allowedRoutes.some((route: any) => {
        return route.path === '/disponibilidades-profissionais/horarios-semanais' && route.method.toLowerCase() === 'post';
      });
      
      setCanRead(canRead);
      setCanCreate(canCreate);
      setCanUpdate(canUpdate);
      setCanDelete(canDelete);
      setCanEditHorariosSemanais(canEditHorariosSemanais);
      
      // Se não tem nem permissão de leitura, marca como access denied
      if (!canRead) {
        setAccessDenied(true);
      }
      
    } catch (error: any) {
      // Em caso de erro, desabilita tudo por segurança
      setCanRead(false);
      setCanCreate(false);
      setCanUpdate(false);
      setCanDelete(false);
      setCanEditHorariosSemanais(false);
      
      // Se retornar 401/403 no endpoint de permissões, considera acesso negado
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  const carregarRecursos = async () => {
    try {
      const data = await getRecursos();
      setRecursos(data.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })));
    } catch (err: any) {
      console.error('Erro ao carregar recursos:', err);
      AppToast.error('Erro ao carregar recursos', {
        description: 'Ocorreu um problema ao carregar a lista de recursos. Tente novamente.'
      });
    }
  };

  const carregarProfissionais = async () => {
    if (!canRead) {
      setAccessDenied(true);
      return;
    }
    
    setLoading(true);
    try {
      const data = await getProfissionais();
      // Ordenar profissionais por ordem alfabética
      const profissionaisOrdenados = data.sort((a, b) => 
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      );
      setProfissionais(profissionaisOrdenados);
      
      // Se o usuário logado for PROFISSIONAL, selecionar automaticamente e bloquear alteração
      if (user?.roles?.includes('PROFISSIONAL') && user?.profissionalId) {
        const profissionalLogado = profissionaisOrdenados.find(p => p.id === user.profissionalId);
        if (profissionalLogado) {
          setProfissionalSelecionado(profissionalLogado);
          setProfissionalBloqueado(true);
        }
      }
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/disponibilidades-profissionais', 'GET');
          setRouteInfo(info);
        } catch (routeError) {
          // Erro ao buscar informações da rota
        }
        // Não mostra toast aqui pois o interceptor já cuida disso
      } else {
        AppToast.error('Erro ao carregar profissionais', {
          description: 'Ocorreu um problema ao carregar a lista de profissionais. Tente novamente.'
        });
      }
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
    setHoraInicioEspecifica('06:00');
    setHoraFimEspecifica('22:30');
    setObservacaoEspecifica('');
    setRecursoSelecionado(null);
    
    // Resetar dropdowns de horário para valores padrão
    setHorarioInicioEspecificoSelecionado(OPCOES_HORARIO_INICIO.find(op => op.nome === '06:00') || null);
    setHorarioFimEspecificoSelecionado(OPCOES_HORARIO_FIM.find(op => op.nome === '22:30') || null);
  };

  const limparDadosComAba = () => {
    limparDados();
    // Resetar aba para semanal apenas quando necessário (troca de profissional)
    setAbaSelecionada('semanal');
  };

  const carregarDisponibilidades = async () => {
    if (!profissionalSelecionado || !canRead) return;
    
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
    AppToast.success('Horários limpos na tela', {
      description: "Todos os horários foram removidos da tela. Clique em 'Salvar Horários' para aplicar as mudanças no sistema."
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
          setHoraFimEspecifica('22:30');
        }
      }
    } else {
      setHoraInicioEspecifica('06:00');
      setHorarioFimEspecificoSelecionado(null);
      setHoraFimEspecifica('22:30');
    }
  };

  // Função para lidar com mudança no horário de fim da data específica
  const handleHorarioFimEspecificoChange = (novoHorario: {id: string, nome: string} | null) => {
    setHorarioFimEspecificoSelecionado(novoHorario);
    
    if (novoHorario) {
      setHoraFimEspecifica(novoHorario.nome);
    } else {
      setHoraFimEspecifica('22:30');
    }
  };

  const handleAdicionarDataEspecifica = async () => {
    if (!profissionalSelecionado || !dataEspecifica || !horarioInicioEspecificoSelecionado || !horarioFimEspecificoSelecionado) {
      AppToast.validation('Campos obrigatórios', 'Preencha todos os campos obrigatórios');
      return;
    }

    if (horarioInicioEspecificoSelecionado.nome >= horarioFimEspecificoSelecionado.nome) {
      AppToast.validation('Horário inválido', 'Horário de início deve ser menor que o horário de fim');
      return;
    }



    setSalvando(true);

    try {
      // Não usar new Date() para evitar conversão de timezone
      // dataEspecifica já está no formato correto YYYY-MM-DD
      const [ano, mes, dia] = dataEspecifica.split('-').map(Number);
      const dataCompleta = new Date(ano, mes - 1, dia); // mes - 1 porque Date usa meses 0-indexed
      
      const [horaInicio, minutoInicio] = horarioInicioEspecificoSelecionado.nome.split(':').map(Number);
      const [horaFim, minutoFim] = horarioFimEspecificoSelecionado.nome.split(':').map(Number);

      const dataHoraInicio = new Date(ano, mes - 1, dia, horaInicio, minutoInicio, 0, 0);
      const dataHoraFim = new Date(ano, mes - 1, dia, horaFim, minutoFim, 0, 0);

      const novaDisponibilidade: CreateDisponibilidadeDto = {
        profissionalId: profissionalSelecionado.id,
        recursoId: recursoSelecionado?.id || null,
        // Enviar horário em UTC fixo para evitar offset (-3h)
        horaInicio: gerarHorarioParaAPI(dataCompleta, horarioInicioEspecificoSelecionado.nome),
        horaFim: gerarHorarioParaAPI(dataCompleta, horarioFimEspecificoSelecionado.nome),
        tipo: tipoEdicao,
        diaSemana: null,
        // Enviar a data diretamente sem conversão adicional
        dataEspecifica: dataEspecifica, // Já está no formato YYYY-MM-DD correto
        observacao: observacaoEspecifica || null
      };



      await createDisponibilidade(novaDisponibilidade);

      // Limpar formulário
      setDataEspecifica('');
      setHoraInicioEspecifica('06:00');
      setHoraFimEspecifica('22:30');
      setObservacaoEspecifica('');
      setRecursoSelecionado(null);
      
      // Resetar dropdowns para valores padrão
      setHorarioInicioEspecificoSelecionado(OPCOES_HORARIO_INICIO.find(op => op.nome === '06:00') || null);
      setHorarioFimEspecificoSelecionado(OPCOES_HORARIO_FIM.find(op => op.nome === '22:30') || null);

      AppToast.created('Disponibilidade específica', 'Disponibilidade específica adicionada com sucesso!');
      await carregarDisponibilidades();

    } catch (err: any) {
      console.error('Erro ao adicionar:', err);
      
      if (err?.response?.status === 409) {
        const errorMessage = err?.response?.data?.message || 'Conflito de horários detectado';
        
        // Verificar se é conflito de recurso específico ou conflito geral
        if (errorMessage.includes('já está utilizando')) {
          AppToast.error('Conflito de Recurso', {
            description: errorMessage
          });
        } else {
          AppToast.error('Conflito de Horários', {
            description: `${errorMessage}. Verifique se não há conflito com horários semanais ou outras datas específicas já configuradas.`
          });
        }
      } else {
        AppToast.error('Erro ao adicionar disponibilidade', {
          description: err?.response?.data?.message || 'Erro ao adicionar disponibilidade'
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
    if (!disponibilidadeParaExcluir) {
      return;
    }
    
    setSalvando(true);
    try {
      await deleteDisponibilidade(disponibilidadeParaExcluir.id);
      AppToast.deleted('Disponibilidade específica', 'Disponibilidade específica removida com sucesso!');
      await carregarDisponibilidades();
      setShowDeleteConfirm(false);
      setDisponibilidadeParaExcluir(null);
    } catch (err: any) {
      AppToast.error('Erro ao remover disponibilidade', {
        description: err?.response?.data?.message || 'Erro ao remover disponibilidade'
      });
    } finally {
      setSalvando(false);
    }
  };

  const getDataAplicacao = (): Date => {
    return new Date();
  };

  const handleSalvar = async () => {
    if (!canEditHorariosSemanais) {
      AppToast.error('Acesso negado', {
        description: 'Você não tem permissão para modificar horários semanais'
      });
      return;
    }
    
    if (!profissionalSelecionado) {
      AppToast.validation('Profissional não selecionado', 'Selecione um profissional');
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
          recursoId: intervalo.recursoId || null, // Agora permite recurso em horários semanais
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
        AppToast.info('Nenhuma alteração detectada', {
          description: 'Não há mudanças para salvar nos horários semanais.'
        });
      } else {
        AppToast.success('Horários salvos com eficiência!', {
          description: `${operacoesRealizadas} operação(ões) realizadas: ${removidos.length} removidas, ${novos.length} criadas.`
        });
      }
      
      // Recarregar para mostrar dados atualizados
      await carregarDisponibilidades();

    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      if (err?.response?.status === 409) {
        const errorMessage = err?.response?.data?.message || 'Conflito de horários detectado';
        
        // Verificar se é conflito de recurso específico ou conflito geral
        if (errorMessage.includes('já está utilizando')) {
          AppToast.error('Conflito de Recurso', {
            description: errorMessage
          });
        } else {
          AppToast.error('Conflito de Horários', {
            description: `${errorMessage}. Verifique se não há conflito com horários semanais ou outras datas específicas já configuradas.`
          });
        }
      } else {
        AppToast.error('Erro ao salvar horários', {
          description: err?.response?.data?.message || 'Erro ao salvar horários'
        });
      }
    } finally {
      setSalvando(false);
    }
  };

  const getResumoHorarios = () => {
    const diasAtivos = horariosSemana.filter(h => h.ativo).length;
    const totalIntervalos = horariosSemana.reduce((acc, h) => acc + h.intervalos.length, 0);
    const intervalosPresencial = horariosSemana.reduce((acc, h) => 
      acc + h.intervalos.filter(i => i.tipo === 'presencial').length, 0
    );
    const intervalosOnline = horariosSemana.reduce((acc, h) => 
      acc + h.intervalos.filter(i => i.tipo === 'online').length, 0
    );
    const intervalosFolga = horariosSemana.reduce((acc, h) => 
      acc + h.intervalos.filter(i => i.tipo === 'folga').length, 0
    );

    return { diasAtivos, totalIntervalos, intervalosPresencial, intervalosOnline, intervalosFolga };
  };

  const resumo = getResumoHorarios();

  // Se acesso negado, mostrar mensagem de acesso negado
  if (accessDenied) {
    return (
      <div className="h-full p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-8 h-8 text-blue-600" />
            Disponibilidades Profissionais
          </h1>
        </div>
        
        {/* Mensagem de acesso negado */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <p className="text-red-600 font-medium mb-2">Acesso Negado</p>
          <div className="text-gray-600 text-sm space-y-1 max-w-md">
            {routeInfo ? (
              <>
                <p><strong>Rota:</strong> {routeInfo.nome}</p>
                <p><strong>Descrição:</strong> {routeInfo.descricao}</p>
                {routeInfo.modulo && <p><strong>Módulo:</strong> {routeInfo.modulo}</p>}
                <p className="text-gray-400 mt-2">Você não tem permissão para acessar este recurso</p>
              </>
            ) : (
              <p>Você não tem permissão para visualizar disponibilidades profissionais</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* HEADER FIXO */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 shadow-sm">
        {/* Título */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-blue-600" />
            Disponibilidades Profissionais
          </h1>
        </div>

        {/* Informações principais - Layout em grid responsivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {/* Profissional */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <User className="w-4 h-4" />
              Profissional
            </div>
            <SingleSelectDropdown
              options={profissionais.map(p => ({ id: p.id, nome: p.nome }))}
              selected={profissionalSelecionado ? { id: profissionalSelecionado.id, nome: profissionalSelecionado.nome } : null}
              onChange={handleSelecionarProfissional}
              placeholder={loading ? "Carregando..." : profissionalBloqueado ? "Profissional atual" : "Selecione..."}
              headerText="Profissionais disponíveis"
              dotColor="green"
              disabled={profissionalBloqueado}
            />
          </div>

          {/* Tipo de Horário */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Clock className="w-4 h-4" />
              Tipo de Horário
            </div>
            <Tabs value={tipoEdicao} onValueChange={(value: any) => setTipoEdicao(value)}>
              <TabsList className="grid w-full grid-cols-3 h-10">
                <TabsTrigger 
                  value="presencial" 
                  className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700 data-[state=active]:border-green-300 text-xs px-1 transition-all duration-200"
                >
                  👥 Presencial
                </TabsTrigger>
                <TabsTrigger 
                  value="online" 
                  className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 text-xs px-1 transition-all duration-200"
                >
                  💻 Online
                </TabsTrigger>
                <TabsTrigger 
                  value="folga" 
                  className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700 data-[state=active]:border-red-300 text-xs px-1 transition-all duration-200"
                >
                  🚫 Bloqueio
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Dias Ativos */}
          <div className="space-y-2 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <CalendarDays className="w-4 h-4" />
              Dias Ativos
            </div>
            {profissionalSelecionado ? (
              <div className="h-10 px-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
                      {resumo.diasAtivos} dias ativos
                    </span>
                  </div>
                  <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                  <div className="flex items-center gap-1 flex-shrink-0 overflow-hidden">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-1 py-0.5 whitespace-nowrap">
                      {resumo.intervalosPresencial} presencial
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-1 py-0.5 whitespace-nowrap">
                      {resumo.intervalosOnline} online
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-1 py-0.5 whitespace-nowrap">
                      {resumo.intervalosFolga} bloqueios
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-10 px-3 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                <span className="text-sm text-gray-500">Selecione um profissional</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTEÚDO COM SCROLL */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-6 py-4">

          {/* Abas de configuração */}
          {profissionalSelecionado && (
            <Card className="mb-4">
              <CardContent className="p-0">
                <Tabs value={abaSelecionada} onValueChange={(value) => {
                  setAbaSelecionada(value as 'semanal' | 'data-especifica');
                }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger 
                  value="semanal" 
                  className={`flex items-center gap-2 transition-colors duration-200 ${
                    tipoEdicao === 'presencial' 
                      ? 'data-[state=active]:bg-green-100 data-[state=active]:text-green-700 data-[state=active]:border-green-300' 
                      : tipoEdicao === 'online'
                      ? 'data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300'
                      : 'data-[state=active]:bg-red-100 data-[state=active]:text-red-700 data-[state=active]:border-red-300'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Horários Semanais
                </TabsTrigger>
                <TabsTrigger 
                  value="data-especifica" 
                  className={`flex items-center gap-2 transition-colors duration-200 ${
                    tipoEdicao === 'presencial' 
                      ? 'data-[state=active]:bg-green-100 data-[state=active]:text-green-700 data-[state=active]:border-green-300' 
                      : tipoEdicao === 'online'
                      ? 'data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300'
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
                        {/* Grid de horários semanais - ajustado para responsividade */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6 mb-6">
                          {horariosSemana.map(horario => (
                            <DiaHorarioCard
                              key={horario.diaSemana}
                              horario={horario}
                              tipoEdicao={tipoEdicao}
                              onChange={handleAlterarHorario}
                              canModify={canEditHorariosSemanais}
                              recursos={recursos}
                            />
                          ))}
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
                                Use esta aba para configurar disponibilidades ou bloqueios em datas específicas (feriados, férias, plantões especiais, etc.).
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Formulário para data específica */}
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                              <Label htmlFor="recurso">Recurso</Label>
                              <SingleSelectDropdown
                                options={recursos.map(r => ({ id: r.id, nome: r.nome }))}
                                selected={recursoSelecionado ? { id: recursoSelecionado.id, nome: recursoSelecionado.nome } : null}
                                onChange={(selected) => {
                                  if (selected) {
                                    const recursoCompleto = recursos.find(r => r.id === selected.id);
                                    setRecursoSelecionado(recursoCompleto || null);
                                  } else {
                                    setRecursoSelecionado(null);
                                  }
                                }}
                                placeholder="Selecione um recurso..."
                                headerText="Recursos disponíveis"
                                dotColor="blue"
                              />
                            </div>
                            <div>
                              <Label className="invisible">Ação</Label>
                              <Button
                                onClick={handleAdicionarDataEspecifica}
                                disabled={salvando || !dataEspecifica || !horarioInicioEspecificoSelecionado || !horarioFimEspecificoSelecionado}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                              >
                                {salvando ? 'Adicionando...' : '+ Adicionar'}
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
                              <div className="grid gap-3 max-h-96 overflow-y-auto pr-2">
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
                                          disp.tipo === 'presencial'
                                            ? 'border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300'
                                            : disp.tipo === 'online'
                                            ? 'border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300'
                                            : 'border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-4">
                                          <div className="flex items-center gap-3 flex-1">
                                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                              disp.tipo === 'presencial' ? 'bg-green-500' : disp.tipo === 'online' ? 'bg-blue-500' : 'bg-red-500'
                                            }`} />
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="font-medium text-gray-900 capitalize">
                                                  {dataFormatada}
                                                </span>
                                                <Badge 
                                                  variant="outline" 
                                                  className={`text-xs flex-shrink-0 ${
                                                    disp.tipo === 'presencial' 
                                                      ? 'border-green-300 text-green-700 bg-green-100' 
                                                      : disp.tipo === 'online'
                                                      ? 'border-blue-300 text-blue-700 bg-blue-100'
                                                      : 'border-red-300 text-red-700 bg-red-100'
                                                  }`}
                                                >
                                                  {disp.tipo === 'presencial' ? '👥 Presencial' : disp.tipo === 'online' ? '💻 Online' : '🚫 Bloqueio'}
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
            <Alert className="mb-4">
              <Info className="w-4 h-4" />
              <AlertDescription>
                Selecione um profissional para configurar seus horários de trabalho
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* FOOTER FIXO */}
      {profissionalSelecionado && abaSelecionada === 'semanal' && (
        <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-4 flex-shrink-0 shadow-sm">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-2">
            <div className="flex flex-wrap items-center gap-2 justify-end">
              {canEditHorariosSemanais ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleLimparHorarios}
                    className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpar Horários
                  </Button>
                  <Button
                    onClick={handleSalvar}
                    disabled={salvando || loading || carregandoDisponibilidades}
                    className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {salvando ? 'Salvando...' : 'Salvar Horários'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    disabled={true}
                    className="flex items-center gap-2 border-gray-300 text-gray-400 opacity-50 cursor-not-allowed"
                    title="Você não tem permissão para modificar horários semanais."
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpar Horários
                  </Button>
                  <Button
                    disabled={true}
                    className="bg-gray-400 cursor-not-allowed flex items-center gap-2"
                    title="Você não tem permissão para modificar horários semanais."
                  >
                    <Save className="w-4 h-4" />
                    Salvar Horários
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}


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
                {disponibilidadeParaExcluir?.tipo === 'disponivel' ? 'disponibilidade' : 'bloqueio'}
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
