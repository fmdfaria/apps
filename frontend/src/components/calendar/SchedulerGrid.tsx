import { useState, useRef, useEffect } from 'react';
import { AppointmentCard } from './AppointmentCard';
import { cn } from '@/lib/utils';

interface SchedulerGridProps {
  profissionais: Array<{
    id: string;
    nome: string;
    avatar: string;
    horarioInicio: string;
    horarioFim: string;
    cor: string;
  }>;
  agendamentos: Array<{
    id: string;
    profissionalId: string;
    paciente: string;
    servico: string;
    convenio: string;
    tipo: string;
    horarioInicio: string;
    horarioFim: string;
    status: string;
    data: Date;
  }>;
  currentDate: Date;
  filters: {
    professionals: string[];
    appointmentType: 'all' | 'online' | 'presencial';
    insurance: string;
    resource: string;
  };
  onAppointmentClick?: (appointmentId: string) => void;
  onDoubleClick?: (profissionalId: string, horario: string) => void;
}

export const SchedulerGrid = ({
  profissionais,
  agendamentos,
  currentDate,
  filters,
  onAppointmentClick,
  onDoubleClick
}: SchedulerGridProps) => {
  const [draggedAppointment, setDraggedAppointment] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const timeColumnRef = useRef<HTMLDivElement>(null);

  // Generate time slots (7:00 to 20:00 in 30-minute intervals)
  const timeSlots = [];
  for (let hour = 7; hour <= 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 20) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  // Filter professionals based on selection
  const filteredProfissionais = filters.professionals.length > 0
    ? profissionais.filter(p => filters.professionals.includes(p.id))
    : profissionais;

  // Filter appointments
  const filteredAgendamentos = agendamentos.filter(appointment => {
    if (filters.professionals.length > 0 && !filters.professionals.includes(appointment.profissionalId)) {
      return false;
    }
    if (filters.appointmentType !== 'all' && appointment.tipo !== filters.appointmentType) {
      return false;
    }
    if (filters.insurance !== 'all' && appointment.convenio.toLowerCase() !== filters.insurance.toLowerCase()) {
      return false;
    }
    return true;
  });

  // Sync scroll between time column and grid
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (timeColumnRef.current && target !== timeColumnRef.current) {
        timeColumnRef.current.scrollTop = target.scrollTop;
      }
      if (gridRef.current && target !== gridRef.current) {
        gridRef.current.scrollTop = target.scrollTop;
      }
    };

    const gridElement = gridRef.current;
    const timeElement = timeColumnRef.current;

    if (gridElement && timeElement) {
      gridElement.addEventListener('scroll', handleScroll);
      timeElement.addEventListener('scroll', handleScroll);

      return () => {
        gridElement.removeEventListener('scroll', handleScroll);
        timeElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  const getAppointmentPosition = (horarioInicio: string, horarioFim: string) => {
    const startMinutes = parseInt(horarioInicio.split(':')[0]) * 60 + parseInt(horarioInicio.split(':')[1]);
    const endMinutes = parseInt(horarioFim.split(':')[0]) * 60 + parseInt(horarioFim.split(':')[1]);
    const baseMinutes = 7 * 60; // 7:00 AM base

    const top = ((startMinutes - baseMinutes) / 30) * 60; // 60px per 30-minute slot
    const height = ((endMinutes - startMinutes) / 30) * 60;

    return { top, height };
  };

  const getStatusColor = (status: string, tipo: string) => {
    if (tipo === 'intervalo') return 'bg-gray-100 border-gray-300 text-gray-600';
    
    switch (status) {
      case 'agendado': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'liberado': return 'bg-green-50 border-green-200 text-green-800';
      case 'atendido': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'finalizado': return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'cancelado': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const handleDoubleClick = (profissionalId: string, timeSlotIndex: number) => {
    if (onDoubleClick) {
      const horario = timeSlots[timeSlotIndex];
      onDoubleClick(profissionalId, horario);
    }
  };

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden bg-white">
      {/* Time Column */}
      <div 
        ref={timeColumnRef}
        className="w-20 bg-gray-50 border-r overflow-y-auto scrollbar-thin"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="h-16 border-b bg-white"></div> {/* Header spacer */}
        <div className="relative">
          {timeSlots.map((time, index) => (
            <div
              key={time}
              className={cn(
                "h-[60px] border-b border-gray-100 flex items-center justify-center text-sm text-gray-600 font-medium",
                index % 2 === 0 ? "bg-gray-50" : "bg-white"
              )}
            >
              {time}
            </div>
          ))}
        </div>
      </div>

      {/* Professional Columns */}
      <div className="flex-1 overflow-hidden">
        <div className="flex">
          {/* Headers */}
          <div className="flex bg-white border-b h-16">
            {filteredProfissionais.map((profissional) => (
              <div
                key={profissional.id}
                className="min-w-[200px] flex-1 border-r border-gray-200 p-3 flex items-center gap-3"
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: profissional.cor }}
                >
                  {profissional.avatar}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{profissional.nome}</div>
                  <div className="text-xs text-gray-500">
                    {profissional.horarioInicio} - {profissional.horarioFim}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div 
          ref={gridRef}
          className="flex overflow-y-auto h-[calc(100%-4rem)]"
          style={{ scrollbarWidth: 'thin' }}
        >
          {filteredProfissionais.map((profissional) => (
            <div
              key={profissional.id}
              className="min-w-[200px] flex-1 border-r border-gray-200 relative bg-white"
            >
              {/* Time grid background */}
              {timeSlots.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-[60px] border-b border-gray-100 cursor-pointer hover:bg-blue-50/30 transition-colors",
                    index % 2 === 0 ? "bg-gray-50/30" : "bg-white"
                  )}
                  onDoubleClick={() => handleDoubleClick(profissional.id, index)}
                />
              ))}

              {/* Appointments */}
              {filteredAgendamentos
                .filter(appointment => appointment.profissionalId === profissional.id)
                .map((appointment) => {
                  const { top, height } = getAppointmentPosition(
                    appointment.horarioInicio,
                    appointment.horarioFim
                  );
                  
                  return (
                    <div
                      key={appointment.id}
                      className="absolute left-1 right-1 z-10"
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <AppointmentCard
                        appointment={appointment}
                        className={cn(
                          "w-full h-full border-l-4 rounded-md shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md",
                          getStatusColor(appointment.status, appointment.tipo)
                        )}
                        style={{ borderLeftColor: profissional.cor }}
                        onDragStart={() => setDraggedAppointment(appointment.id)}
                        onDragEnd={() => setDraggedAppointment(null)}
                        isDragging={draggedAppointment === appointment.id}
                        onDetailsClick={onAppointmentClick}
                      />
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
