import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Clock } from 'lucide-react';
import type { HorarioSemana, IntervaloHorario } from '@/types/DisponibilidadeProfissional';
import { validarIntervalo, verificarSobreposicao, marcarComoNovo } from '@/lib/horarios-utils';

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
    horaInicio: '08:00',
    horaFim: '12:00',
    tipo: tipoEdicao
  });

  const [intervaloParaExcluir, setIntervaloParaExcluir] = useState<string | null>(null);
  const [erro, setErro] = useState('');

  const handleToggleAtivo = (ativo: boolean) => {
    onChange({
      ...horario,
      ativo,
      intervalos: ativo ? horario.intervalos : []
    });
  };

  const handleAdicionarIntervalo = () => {
    const erro = validarIntervalo(novoIntervalo.horaInicio, novoIntervalo.horaFim);
    if (erro) {
      setErro(erro);
      return;
    }

    if (verificarSobreposicao(horario.intervalos, novoIntervalo)) {
      setErro('Este horário se sobrepõe a um intervalo existente');
      return;
    }

    const novoIntervaloPadrao: IntervaloHorario = marcarComoNovo({
      id: `temp-${Date.now()}`,
      ...novoIntervalo,
      tipo: tipoEdicao
    });

    const intervalosOrdenados = ordenarIntervalos([...horario.intervalos, novoIntervaloPadrao]);

    onChange({
      ...horario,
      ativo: true,
      intervalos: intervalosOrdenados
    });

    setNovoIntervalo({
      horaInicio: '08:00',
      horaFim: '12:00',
      tipo: tipoEdicao
    });
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
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      {/* Header do dia */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={horario.ativo}
            onCheckedChange={handleToggleAtivo}
            className="data-[state=checked]:bg-blue-600"
          />
          <div>
            <h3 className="font-medium text-gray-900">{horario.nomeDia}</h3>
            <p className="text-sm text-gray-500">
              {horario.intervalos.length > 0 
                ? `${horario.intervalos.length} intervalo(s)` 
                : 'Nenhum intervalo'
              }
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`${getTipoColor(tipoEdicao)} font-medium`}>
          {tipoEdicao === 'disponivel' ? '✅ Disponível' : '🚫 Folga'}
        </Badge>
      </div>

      {/* Lista de intervalos existentes */}
      {horario.ativo && (
        <div className="space-y-3">
          {ordenarIntervalos(horario.intervalos).map((intervalo) => (
            <div key={intervalo.id} className={`border rounded-lg p-3 ${getTipoColor(intervalo.tipo)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">
                    {intervalo.horaInicio} - {intervalo.horaFim}
                  </span>
                  {/* Badge NOVO posicionado após o horário */}
                  {intervalo.isNew && (
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300 ml-2">
                      NOVO
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIntervaloParaExcluir(intervalo.id!)}
                  className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {intervalo.observacao && (
                <p className="text-sm mt-2 opacity-75">{intervalo.observacao}</p>
              )}
            </div>
          ))}

          {/* Formulário para adicionar novo intervalo */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-4 h-4 text-gray-400" />
              <Label className="text-sm text-gray-600">Adicionar intervalo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={novoIntervalo.horaInicio}
                onChange={(e) => setNovoIntervalo(prev => ({ ...prev, horaInicio: e.target.value }))}
                className="w-20 h-8"
              />
              <span className="text-sm text-gray-500">até</span>
              <Input
                type="time"
                value={novoIntervalo.horaFim}
                onChange={(e) => setNovoIntervalo(prev => ({ ...prev, horaFim: e.target.value }))}
                className="w-20 h-8"
              />
              <Button
                size="sm"
                onClick={handleAdicionarIntervalo}
                className="h-8 bg-blue-600 hover:bg-blue-700"
              >
                Adicionar
              </Button>
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