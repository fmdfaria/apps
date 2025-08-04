import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { TimeSelectDropdown } from '@/components/ui/time-select-dropdown';
import { Plus, Trash2, Clock } from 'lucide-react';
import type { HorarioSemana, IntervaloHorario } from '@/types/DisponibilidadeProfissional';
import { validarIntervalo, verificarSobreposicao, marcarComoNovo } from '@/lib/horarios-utils';

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

// Função para ordenar intervalos por hora de início
const ordenarIntervalos = (intervalos: IntervaloHorario[]): IntervaloHorario[] => {
  return [...intervalos].sort((a, b) => {
    const [horaA, minutoA] = a.horaInicio.split(':').map(Number);
    const [horaB, minutoB] = b.horaInicio.split(':').map(Number);
    const minutosA = horaA * 60 + minutoA;
    const minutosB = horaB * 60 + minutoB;
    return minutosA - minutosB;
  });
};

interface Props {
  horario: HorarioSemana;
  tipoEdicao: 'disponivel' | 'folga';
  onChange: (horario: HorarioSemana) => void;
}

export default function DiaHorarioCard({ horario, tipoEdicao, onChange }: Props) {
  const [novoIntervalo, setNovoIntervalo] = useState<IntervaloHorario>({
    horaInicio: '',
    horaFim: '',
    tipo: tipoEdicao
  });

  const [intervaloParaExcluir, setIntervaloParaExcluir] = useState<string | null>(null);
  const [erro, setErro] = useState('');

  // Estado para os dropdowns de horário
  const [horarioInicioSelecionado, setHorarioInicioSelecionado] = useState<{id: string, nome: string} | null>(
    OPCOES_HORARIO_INICIO.find(op => op.nome === '') || null
  );
  const [horarioFimSelecionado, setHorarioFimSelecionado] = useState<{id: string, nome: string} | null>(
    OPCOES_HORARIO_FIM.find(op => op.nome === '') || null
  );

  // Função para lidar com mudança no horário de início
  const handleHorarioInicioChange = (novoHorario: {id: string, nome: string} | null) => {
    setHorarioInicioSelecionado(novoHorario);
    
    if (novoHorario) {
      // Calcular horário de fim automático (30 min depois)
      const horarioFimAuto = calcularHorario30MinDepois(novoHorario.nome);
      const opcaoFimAuto = OPCOES_HORARIO_FIM.find(op => op.nome === horarioFimAuto);
      
      if (opcaoFimAuto) {
        setHorarioFimSelecionado(opcaoFimAuto);
      } else {
        // Se não encontrar a opção automática, selecionar a primeira opção válida
        const opcoesValidas = filtrarOpcoesHorarioFim(novoHorario.nome);
        setHorarioFimSelecionado(opcoesValidas.length > 0 ? opcoesValidas[0] : null);
      }
    } else {
      setHorarioFimSelecionado(null);
    }
  };

  // Função para lidar com mudança no horário de fim
  const handleHorarioFimChange = (novoHorario: {id: string, nome: string} | null) => {
    setHorarioFimSelecionado(novoHorario);
    
    // Limpar erro se houver
    if (erro) {
      setErro('');
    }
  };

  // Gerar opções filtradas para o dropdown de fim
  const opcoesHorarioFim = filtrarOpcoesHorarioFim(horarioInicioSelecionado?.nome || null);

  const handleToggleAtivo = (ativo: boolean) => {
    onChange({
      ...horario,
      ativo,
      intervalos: ativo ? horario.intervalos : []
    });
  };

  const handleAdicionarIntervalo = () => {
    if (!horarioInicioSelecionado || !horarioFimSelecionado) {
      setErro('Selecione os horários de início e fim');
      return;
    }

    const intervaloParaValidar = {
      horaInicio: horarioInicioSelecionado.nome,
      horaFim: horarioFimSelecionado.nome,
      tipo: tipoEdicao
    };

    const erro = validarIntervalo(intervaloParaValidar.horaInicio, intervaloParaValidar.horaFim);
    if (erro) {
      setErro(erro);
      return;
    }

    if (verificarSobreposicao(horario.intervalos, intervaloParaValidar)) {
      setErro('Este horário se sobrepõe a um intervalo existente');
      return;
    }

    const novoIntervaloPadrao: IntervaloHorario = marcarComoNovo({
      id: `temp-${Date.now()}`,
      ...intervaloParaValidar,
      tipo: tipoEdicao
    });

    const intervalosOrdenados = ordenarIntervalos([...horario.intervalos, novoIntervaloPadrao]);

    onChange({
      ...horario,
      ativo: true,
      intervalos: intervalosOrdenados
    });

    // Reset dos dropdowns
    const inicioDefault = OPCOES_HORARIO_INICIO.find(op => op.nome === '') || null;
    setHorarioInicioSelecionado(inicioDefault);
    setHorarioFimSelecionado(OPCOES_HORARIO_FIM.find(op => op.nome === '') || null);
    setErro('');
  };



  const handleExcluirIntervalo = (id: string) => {
    const intervalosAtualizados = horario.intervalos.filter(intervalo => intervalo.id !== id);
    onChange({
      ...horario,
      intervalos: intervalosAtualizados,
      ativo: intervalosAtualizados.length > 0
    });
    setIntervaloParaExcluir(null);
  };

  const getTipoColor = (tipo: 'disponivel' | 'folga') => {
    return tipo === 'disponivel' 
      ? 'bg-green-100 text-green-700 border-green-200' 
      : 'bg-red-100 text-red-700 border-red-200';
  };

  return (
    <div className="border rounded-lg p-3 sm:p-4 bg-white shadow-sm overflow-hidden">
      {/* Header do dia */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Switch
            checked={horario.ativo}
            onCheckedChange={handleToggleAtivo}
            className="data-[state=checked]:bg-blue-600 flex-shrink-0"
          />
          <div className="min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{horario.nomeDia}</h3>
            <p className="text-sm text-gray-500">
              {horario.intervalos.length > 0 
                ? `${horario.intervalos.length} intervalo(s)` 
                : 'Nenhum intervalo'
              }
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`${getTipoColor(tipoEdicao)} font-medium flex-shrink-0 text-xs sm:text-sm`}>
          {tipoEdicao === 'disponivel' ? '✅ Disponível' : '🚫 Folga'}
        </Badge>
      </div>

      {/* Lista de intervalos existentes */}
      {horario.ativo && (
        <div className="space-y-3">
          {ordenarIntervalos(horario.intervalos).map((intervalo) => (
            <div key={intervalo.id} className={`border rounded-lg p-3 ${getTipoColor(intervalo.tipo)}`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base">
                    {intervalo.horaInicio} - {intervalo.horaFim}
                  </span>
                  {/* Badge NOVO posicionado após o horário */}
                  {intervalo.isNew && (
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                      NOVO
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIntervaloParaExcluir(intervalo.id!)}
                  className="text-red-600 hover:text-red-700 h-8 w-8 p-0 flex-shrink-0 self-end sm:self-center"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {intervalo.observacao && (
                <p className="text-sm mt-2 opacity-75 break-words">{intervalo.observacao}</p>
              )}
            </div>
          ))}

          {/* Formulário para adicionar novo intervalo */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-4 h-4 text-gray-400" />
              <Label className="text-sm text-gray-600">Adicionar intervalo</Label>
            </div>
            
            {/* Layout responsivo */}
            <div className="space-y-3">
              {/* Em telas pequenas: layout vertical */}
              <div className="sm:hidden space-y-3">
                <div>
                  <TimeSelectDropdown
                    options={OPCOES_HORARIO_INICIO}
                    selected={horarioInicioSelecionado}
                    onChange={handleHorarioInicioChange}
                    placeholder="Horário de início"
                    headerText="Horário de início"
                  />
                </div>
                <div className="text-center">
                  <span className="text-sm text-gray-500">até</span>
                </div>
                <div>
                  <TimeSelectDropdown
                    options={opcoesHorarioFim}
                    selected={horarioFimSelecionado}
                    onChange={handleHorarioFimChange}
                    placeholder="Horário de fim"
                    headerText="Horário de fim"
                  />
                </div>
                <div className="flex justify-center">
                  <Button
                    size="sm"
                    onClick={handleAdicionarIntervalo}
                    className="h-8 px-4 bg-blue-600 hover:bg-blue-700"
                    title="Adicionar intervalo"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>
              
              {/* Em telas médias e grandes: layout horizontal */}
              <div className="hidden sm:flex sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <TimeSelectDropdown
                    options={OPCOES_HORARIO_INICIO}
                    selected={horarioInicioSelecionado}
                    onChange={handleHorarioInicioChange}
                    placeholder="Início"
                    headerText="Horário de início"
                  />
                </div>
                <span className="text-sm text-gray-500 px-1 flex-shrink-0">até</span>
                <div className="flex-1 min-w-0">
                  <TimeSelectDropdown
                    options={opcoesHorarioFim}
                    selected={horarioFimSelecionado}
                    onChange={handleHorarioFimChange}
                    placeholder="Fim"
                    headerText="Horário de fim"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleAdicionarIntervalo}
                  className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                  title="Adicionar intervalo"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {erro && (
              <p className="text-red-500 text-sm mt-2">{erro}</p>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={!!intervaloParaExcluir} onOpenChange={() => setIntervaloParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão de horário</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="py-2 space-y-3">
            <p>Tem certeza que deseja excluir este intervalo de horário?</p>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>Importante:</strong> Esta exclusão será apenas visual na tela. Para efetivar a remoção no sistema, você precisará clicar em <strong>"Salvar Horários"</strong> após confirmar esta exclusão.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIntervaloParaExcluir(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => intervaloParaExcluir && handleExcluirIntervalo(intervaloParaExcluir)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover da Tela
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 