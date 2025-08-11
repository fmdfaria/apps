import type { HorarioSemana, IntervaloHorario, DisponibilidadeProfissional } from '@/types/DisponibilidadeProfissional';

export const DIAS_SEMANA = [
  { numero: 1, nome: 'Segunda-feira', abrev: 'Seg' },
  { numero: 2, nome: 'Terça-feira', abrev: 'Ter' },
  { numero: 3, nome: 'Quarta-feira', abrev: 'Qua' },
  { numero: 4, nome: 'Quinta-feira', abrev: 'Qui' },
  { numero: 5, nome: 'Sexta-feira', abrev: 'Sex' },
  { numero: 6, nome: 'Sábado', abrev: 'Sáb' },
  { numero: 0, nome: 'Domingo', abrev: 'Dom' }
];

export const HORARIOS_PADRAO = Array.from({ length: 24 }, (_, i) => {
  const hora = i.toString().padStart(2, '0');
  return `${hora}:00`;
});

export const criarHorarioSemanaPadrao = (): HorarioSemana[] => {
  return DIAS_SEMANA.map(dia => ({
    diaSemana: dia.numero,
    nomeDia: dia.nome,
    ativo: dia.numero >= 1 && dia.numero <= 5, // Segunda a sexta ativo por padrão
    intervalos: dia.numero >= 1 && dia.numero <= 5 ? [
      {
        horaInicio: '08:00',
        horaFim: '12:00',
        tipo: 'presencial',
        recursoId: null
      },
      {
        horaInicio: '12:00',
        horaFim: '13:00',
        tipo: 'folga',
        recursoId: null
      },
      {
        horaInicio: '13:00',
        horaFim: '17:00',
        tipo: 'presencial',
        recursoId: null
      }
    ] : []
  }));
};

export const formatarHorario = (hora: string): string => {
  return hora.length === 5 ? hora : `${hora}:00`;
};

export const validarIntervalo = (inicio: string, fim: string): string | null => {
  if (!inicio || !fim) return 'Horário de início e fim são obrigatórios';
  
  const [horaInicio, minutoInicio] = inicio.split(':').map(Number);
  const [horaFim, minutoFim] = fim.split(':').map(Number);
  
  const inicioMinutos = horaInicio * 60 + minutoInicio;
  const fimMinutos = horaFim * 60 + minutoFim;
  
  if (inicioMinutos >= fimMinutos) {
    return 'Horário de início deve ser menor que o horário de fim';
  }
  
  return null;
};

export const verificarSobreposicao = (intervalos: IntervaloHorario[], novoIntervalo: IntervaloHorario): boolean => {
  const [novaHoraInicio, novoMinutoInicio] = novoIntervalo.horaInicio.split(':').map(Number);
  const [novaHoraFim, novoMinutoFim] = novoIntervalo.horaFim.split(':').map(Number);
  
  const novoInicioMinutos = novaHoraInicio * 60 + novoMinutoInicio;
  const novoFimMinutos = novaHoraFim * 60 + novoMinutoFim;
  
  return intervalos.some(intervalo => {
    if (intervalo.id === novoIntervalo.id) return false; // Ignorar o próprio intervalo na edição
    
    const [horaInicio, minutoInicio] = intervalo.horaInicio.split(':').map(Number);
    const [horaFim, minutoFim] = intervalo.horaFim.split(':').map(Number);
    
    const inicioMinutos = horaInicio * 60 + minutoInicio;
    const fimMinutos = horaFim * 60 + minutoFim;
    
    // Verifica sobreposição
    return (novoInicioMinutos < fimMinutos && novoFimMinutos > inicioMinutos);
  });
};

export const converterDisponibilidadesParaHorarios = (disponibilidades: DisponibilidadeProfissional[]): HorarioSemana[] => {
  const horarios = criarHorarioSemanaPadrao();
  
  // Limpar intervalos padrão
  horarios.forEach(dia => {
    dia.intervalos = [];
    dia.ativo = false;
  });
  
  disponibilidades.forEach(disp => {
    if (disp.diaSemana !== null && disp.diaSemana !== undefined) {
      const dia = horarios.find(h => h.diaSemana === disp.diaSemana);
      if (dia) {
        dia.ativo = true;
        const intervalo: IntervaloHorario = {
          id: disp.id,
          horaInicio: disp.horaInicio.toTimeString().slice(0, 5),
          horaFim: disp.horaFim.toTimeString().slice(0, 5),
          tipo: disp.tipo,
          recursoId: disp.recursoId || null,
          observacao: disp.observacao || undefined
        };
        dia.intervalos.push(marcarComoExistente(intervalo));
      }
    }
  });
  
  // Ordenar intervalos por hora de início para cada dia
  horarios.forEach(dia => {
    dia.intervalos.sort((a, b) => {
      const [horaA, minutoA] = a.horaInicio.split(':').map(Number);
      const [horaB, minutoB] = b.horaInicio.split(':').map(Number);
      const minutosA = horaA * 60 + minutoA;
      const minutosB = horaB * 60 + minutoB;
      return minutosA - minutosB;
    });
  });
  
  return horarios;
};

export const formatarDataParaAPI = (data: Date): string => {
  return data.toISOString();
};

export const gerarHorarioParaAPI = (data: Date, horario: string): string => {
  const [hora, minuto] = horario.split(':').map(Number);
  const novaData = new Date(data);
  novaData.setHours(hora, minuto, 0, 0);
  return novaData.toISOString();
};

// Funções para gerenciar estado de alterações
export const marcarComoNovo = (intervalo: IntervaloHorario): IntervaloHorario => {
  return {
    ...intervalo,
    isNew: true
  };
};

export const marcarComoExistente = (intervalo: IntervaloHorario): IntervaloHorario => {
  return {
    ...intervalo,
    isNew: false
  };
};

export const compararHorarios = (horarios1: HorarioSemana[], horarios2: HorarioSemana[]): {
  novos: IntervaloHorario[];
  removidos: IntervaloHorario[];
} => {
  const novos: IntervaloHorario[] = [];
  const removidos: IntervaloHorario[] = [];

  // Criar mapa dos intervalos originais por ID
  const originaisMap = new Map<string, IntervaloHorario>();
  horarios2.forEach(dia => {
    dia.intervalos.forEach(intervalo => {
      if (intervalo.id && !intervalo.id.startsWith('temp-')) {
        originaisMap.set(intervalo.id, intervalo);
      }
    });
  });

  // Verificar intervalos atuais
  horarios1.forEach(dia => {
    dia.intervalos.forEach(intervalo => {
      if (!intervalo.id || intervalo.id.startsWith('temp-')) {
        // Novo intervalo
        novos.push({ ...intervalo, diaSemana: dia.diaSemana } as any);
      } else {
        // Intervalo existente - remover do mapa (os que sobrarem foram deletados)
        originaisMap.delete(intervalo.id);
      }
    });
  });

  // Intervalos que sobraram no mapa foram removidos
  originaisMap.forEach(intervalo => {
    removidos.push(intervalo);
  });

  return { novos, removidos };
}; 