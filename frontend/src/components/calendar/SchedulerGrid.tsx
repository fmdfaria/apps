import { useState, useRef, useEffect } from 'react';
import { AppointmentCard } from './AppointmentCard';
import { cn } from '@/lib/utils';
import { X, User, Monitor, Coffee } from 'lucide-react';

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
    recursoId: string;
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
  viewType?: 'profissionais' | 'recursos';
  filters: {
    professionals: string[];
    resources?: string[];
    appointmentType: 'all' | 'online' | 'presencial';
    insurance: string;
    resource: string;
  };
  onAppointmentClick?: (appointmentId: string) => void;
  onEditClick?: (appointmentId: string) => void;
  onCancelClick?: (appointmentId: string) => void;
  onDoubleClick?: (entityId: string, horario: string) => void;
  verificarDisponibilidade?: (profissionalId: string, data: Date, horario: string) => boolean;
  verificarStatusDisponibilidade?: (profissionalId: string, data: Date, horario: string) => 'presencial' | 'online' | 'folga' | 'nao_configurado';
  availabilities?: Array<{
    id: string;
    profissionalId: string;
    recursoId?: string | null;
    horaInicio: Date;
    horaFim: Date;
    tipo: 'presencial' | 'online' | 'folga';
    diaSemana: number | null;
    dataEspecifica: Date | null;
  }>;
}

export const SchedulerGrid = ({
  profissionais,
  agendamentos,
  currentDate,
  viewType = 'profissionais',
  filters,
  onAppointmentClick,
  onEditClick,
  onCancelClick,
  onDoubleClick,
  verificarDisponibilidade,
  verificarStatusDisponibilidade,
  availabilities = []
}: SchedulerGridProps) => {
  const [draggedAppointment, setDraggedAppointment] = useState<string | null>(null);
  const timeColumnRef = useRef<HTMLDivElement>(null);
  const entitiesColumnsContainerRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  // Filter entities first to know which ones to consider for time slots
  const filterIds = viewType === 'profissionais' ? filters.professionals : (filters.resources || []);
  const filteredEntities = (filterIds.length > 0
    ? profissionais.filter(p => filterIds.includes(p.id))
    : profissionais)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  // Filter appointments for the filtered entities
  const relevantAgendamentos = agendamentos.filter(appointment => {
    if (viewType === 'profissionais' && filterIds.length > 0) {
      return filterIds.includes(appointment.profissionalId);
    }
    if (viewType === 'recursos' && filters.resources && filters.resources.length > 0) {
      return filters.resources.includes(appointment.recursoId);
    }
    // If no filters, include all appointments for the current entities
    if (viewType === 'profissionais') {
      return filteredEntities.some(e => e.id === appointment.profissionalId);
    } else {
      return filteredEntities.some(e => e.id === appointment.recursoId);
    }
  });

  // Calculate dynamic time range based on availabilities and appointments
  const calculateDynamicTimeSlots = () => {
    let minHour = 24; // Start with max possible
    let maxHour = 0;   // Start with min possible

    // Consider appointments first
    relevantAgendamentos.forEach(appointment => {
      const startHour = parseInt(appointment.horarioInicio.split(':')[0]);
      const endHour = parseInt(appointment.horarioFim.split(':')[0]);
      const endMinute = parseInt(appointment.horarioFim.split(':')[1]);
      
      minHour = Math.min(minHour, startHour);
      maxHour = Math.max(maxHour, endMinute > 0 ? endHour + 1 : endHour);
    });

    // Consider availabilities directly for better performance
    if (availabilities.length > 0 && viewType === 'profissionais') {
      // Filter availabilities for current date and selected entities
      const relevantAvailabilities = availabilities.filter(availability => {
        // Check if availability is for a filtered entity
        const entityMatch = filterIds.length === 0 || filterIds.includes(availability.profissionalId);
        if (!entityMatch) return false;

        // Check if availability applies to current date
        if (availability.dataEspecifica) {
          // Specific date availability
          const availDate = new Date(availability.dataEspecifica);
          return availDate.getFullYear() === currentDate.getFullYear() &&
                 availDate.getMonth() === currentDate.getMonth() &&
                 availDate.getDate() === currentDate.getDate();
        } else if (availability.diaSemana !== null) {
          // Weekly recurring availability
          return availability.diaSemana === currentDate.getDay();
        }
        return false;
      });

      // Extract time ranges from relevant availabilities
      relevantAvailabilities.forEach(availability => {
        const startHour = availability.horaInicio.getHours();
        const endHour = availability.horaFim.getHours();
        const endMinute = availability.horaFim.getMinutes();
        
        minHour = Math.min(minHour, startHour);
        maxHour = Math.max(maxHour, endMinute > 0 ? endHour + 1 : endHour);
      });
    } 
    // Fallback to verificarStatusDisponibilidade if availabilities not provided
    else if (verificarStatusDisponibilidade && viewType === 'profissionais') {
      filteredEntities.forEach(entity => {
        // Check each hour from 5:00 to 22:00 for availability
        for (let hour = 5; hour <= 22; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const status = verificarStatusDisponibilidade(entity.id, currentDate, timeStr);
            
            if (status === 'presencial' || status === 'online' || status === 'folga') {
              minHour = Math.min(minHour, hour);
              maxHour = Math.max(maxHour, hour + 1);
            }
          }
        }
      });
    }

    // If no data found, use default range
    if (minHour === 24) minHour = 8;
    if (maxHour === 0) maxHour = 18;

    // Ensure we have at least 8 hours visible and round to reasonable boundaries
    minHour = Math.max(5, Math.min(minHour, 20)); // Don't start later than 20:00
    maxHour = Math.min(23, Math.max(maxHour, minHour + 8)); // At least 8 hours, don't end later than 23:00

    // Generate time slots for the calculated range
    const slots = [];
    for (let hour = minHour; hour <= maxHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < maxHour) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }

    return { slots, minHour, maxHour };
  };

  const { slots: timeSlots, minHour, maxHour } = calculateDynamicTimeSlots();

  // Filter appointments
  const filteredAgendamentos = agendamentos.filter(appointment => {
    // For profissionais view, filter by professionals
    if (viewType === 'profissionais' && filters.professionals.length > 0 && !filters.professionals.includes(appointment.profissionalId)) {
      return false;
    }
    // For recursos view, filter by resources
    if (viewType === 'recursos' && filters.resources && filters.resources.length > 0 && !filters.resources.includes(appointment.recursoId)) {
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

  // Sync scroll between time column and entity columns (vertical) + header and content (horizontal)
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    
    const handleVerticalScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (timeColumnRef.current && target !== timeColumnRef.current) {
        // Immediate sync
        timeColumnRef.current.scrollTop = target.scrollTop;
        
        // Additional correction after scroll ends
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          if (timeColumnRef.current) {
            timeColumnRef.current.scrollTop = target.scrollTop;
          }
        }, 50);
      }
    };

    const handleHorizontalScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (headerScrollRef.current && target !== headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = target.scrollLeft;
      }
      if (entitiesColumnsContainerRef.current && target !== entitiesColumnsContainerRef.current) {
        entitiesColumnsContainerRef.current.scrollLeft = target.scrollLeft;
      }
    };

    const entitiesContainer = entitiesColumnsContainerRef.current;
    const headerContainer = headerScrollRef.current;

    if (entitiesContainer && timeColumnRef.current) {
      // Vertical scroll sync
      entitiesContainer.addEventListener('scroll', handleVerticalScroll, { passive: true });
      
      // Horizontal scroll sync
      entitiesContainer.addEventListener('scroll', handleHorizontalScroll, { passive: true });
      if (headerContainer) {
        headerContainer.addEventListener('scroll', handleHorizontalScroll, { passive: true });
      }

      return () => {
        entitiesContainer.removeEventListener('scroll', handleVerticalScroll);
        entitiesContainer.removeEventListener('scroll', handleHorizontalScroll);
        if (headerContainer) {
          headerContainer.removeEventListener('scroll', handleHorizontalScroll);
        }
        clearTimeout(scrollTimeout);
      };
    }
  }, []);

  const getAppointmentPosition = (horarioInicio: string, horarioFim: string) => {
    const startMinutes = parseInt(horarioInicio.split(':')[0]) * 60 + parseInt(horarioInicio.split(':')[1]);
    const endMinutes = parseInt(horarioFim.split(':')[0]) * 60 + parseInt(horarioFim.split(':')[1]);
    const baseMinutes = minHour * 60; // Use dynamic minHour as base

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

  const handleDoubleClick = (entityId: string, timeSlotIndex: number) => {
    if (onDoubleClick) {
      const horario = timeSlots[timeSlotIndex];
      onDoubleClick(entityId, horario);
    }
  };

  return (
    <div className="flex h-full border rounded-lg overflow-hidden bg-white">
      {/* Time Column */}
      <div className="w-20 bg-gray-50 border-r flex flex-col flex-shrink-0">
        {/* Fixed Time Header */}
        <div className="h-16 border-b bg-white flex items-center justify-center text-sm font-semibold text-gray-700 sticky top-0 z-40 shadow-sm">
          Hora
        </div>
        
        {/* Scrollable Time Content */}
        <div 
          ref={timeColumnRef}
          className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none'
          }}
        >
          <div className="relative">
            {timeSlots.map((time, index) => (
              <div
                key={time}
                className={cn(
                  "h-[60px] border-b border-gray-100 flex items-center justify-center text-sm text-gray-600 font-medium flex-shrink-0",
                  index % 2 === 0 ? "bg-gray-50" : "bg-white"
                )}
              >
                {time}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Entity Columns */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Fixed Headers */}
        <div 
          ref={headerScrollRef}
          className="bg-white border-b h-16 flex-shrink-0 z-30 shadow-sm overflow-x-auto overflow-y-hidden"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none'
          }}
        >
          <div className="flex min-w-max">
            {filteredEntities.map((entity) => (
              <div
                key={entity.id}
                className="w-[250px] border-r border-gray-200 p-3 flex items-center justify-start gap-3 flex-shrink-0"
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: entity.cor }}
                >
                  {entity.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm truncate">{entity.nome}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          ref={entitiesColumnsContainerRef} 
          className="flex-1 overflow-auto" 
          style={{ 
            scrollbarWidth: 'thin',
            scrollBehavior: 'smooth'
          }}
        >
          {/* Grid */}
          <div className="flex min-h-full">
            {filteredEntities.map((entity) => (
            <div
              key={entity.id}
              className="w-[250px] border-r border-gray-200 relative bg-white flex-shrink-0"
            >
              {/* Time grid background */}
              {timeSlots.map((timeSlot, index) => {
                let statusDisponibilidade: 'presencial' | 'online' | 'folga' | 'nao_configurado' = 'presencial';
                let isDisponivel = true;
                
                if (viewType === 'profissionais' && verificarStatusDisponibilidade) {
                  statusDisponibilidade = verificarStatusDisponibilidade(entity.id, currentDate, timeSlot);
                  isDisponivel = statusDisponibilidade === 'presencial' || statusDisponibilidade === 'online';
                } else if (viewType === 'recursos') {
                  // Para recursos, sempre permitir duplo clique
                  isDisponivel = true;
                }
                
                // Determinar classes CSS baseadas no status
                let statusClasses = "cursor-pointer hover:bg-blue-50/30";
                let statusTitle = undefined;
                let statusIcon = null;
                
                if (viewType === 'profissionais' && verificarStatusDisponibilidade) {
                  switch (statusDisponibilidade) {
                    case 'presencial':
                      statusClasses = "cursor-pointer hover:bg-green-50/30 bg-green-50/20 border-l-2 border-green-300";
                      statusTitle = "Disponível para atendimento presencial - Duplo clique para agendar";
                      statusIcon = <User className="w-3 h-3 text-green-500 opacity-60" />;
                      break;
                    case 'online':
                      statusClasses = "cursor-pointer hover:bg-blue-50/30 bg-blue-50/20 border-l-2 border-blue-300";
                      statusTitle = "Disponível para atendimento online - Duplo clique para agendar";
                      statusIcon = <Monitor className="w-3 h-3 text-blue-500 opacity-60" />;
                      break;
                    case 'folga':
                      statusClasses = "cursor-not-allowed bg-red-50/50 hover:bg-red-100/50 border-l-2 border-red-300";
                      statusTitle = "Horário indisponível (folga)";
                      statusIcon = <Coffee className="w-3 h-3 text-red-400 opacity-60" />;
                      break;
                    case 'nao_configurado':
                      statusClasses = "cursor-not-allowed bg-gray-100/50 hover:bg-gray-200/50 border-l-2 border-gray-300";
                      statusTitle = "Horário não configurado";
                      statusIcon = <X className="w-3 h-3 text-gray-400 opacity-50" />;
                      break;
                  }
                } else if (viewType === 'recursos') {
                  statusClasses = "cursor-pointer hover:bg-orange-50/30";
                  statusTitle = "Duplo clique para agendar neste recurso";
                }
                
                return (
                  <div
                    key={index}
                    className={cn(
                      "h-[60px] border-b border-gray-100 transition-colors relative",
                      index % 2 === 0 ? "bg-gray-50/30" : "bg-white",
                      statusClasses
                    )}
                    onDoubleClick={isDisponivel ? () => handleDoubleClick(entity.id, index) : undefined}
                    title={statusTitle}
                  >
                    {statusIcon && (
                      <div className="absolute top-1 right-1">
                        {statusIcon}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Appointments */}
              {filteredAgendamentos
                .filter(appointment => {
                  // For profissionais view, filter by profissionalId
                  if (viewType === 'profissionais') {
                    return appointment.profissionalId === entity.id;
                  }
                  // For recursos view, filter by recursoId
                  if (viewType === 'recursos') {
                    return appointment.recursoId === entity.id;
                  }
                  return true;
                })
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
                        viewType={viewType}
                        entityName={entity.nome}
                        className={cn(
                          "w-full h-full border-l-4 rounded-md shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md",
                          getStatusColor(appointment.status, appointment.tipo)
                        )}
                        style={{ borderLeftColor: entity.cor }}
                        onDragStart={() => setDraggedAppointment(appointment.id)}
                        onDragEnd={() => setDraggedAppointment(null)}
                        isDragging={draggedAppointment === appointment.id}
                        onDetailsClick={onAppointmentClick}
                        onEditClick={onEditClick}
                        onCancelClick={onCancelClick}
                      />
                    </div>
                  );
                })}
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
};
