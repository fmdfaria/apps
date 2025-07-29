import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Monitor, MapPin, Clock, User, Stethoscope, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppointmentCardProps {
  appointment: {
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
  };
  className?: string;
  style?: React.CSSProperties;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  onDetailsClick?: (appointmentId: string) => void;
}

export const AppointmentCard = ({
  appointment,
  className,
  style,
  onDragStart,
  onDragEnd,
  isDragging,
  onDetailsClick
}: AppointmentCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getTypeIcon = () => {
    if (appointment.tipo === 'online') return <Monitor className="w-3 h-3" />;
    if (appointment.tipo === 'presencial') return <MapPin className="w-3 h-3" />;
    return null;
  };

  const getStatusBadge = () => {
    if (appointment.tipo === 'intervalo') {
      return <Badge variant="secondary" className="text-xs">Intervalo</Badge>;
    }
    
    switch (appointment.status) {
      case 'agendado':
        return <Badge className="bg-blue-500 text-xs">Agendado</Badge>;
      case 'liberado':
        return <Badge className="bg-green-500 text-xs">Liberado</Badge>;
      case 'atendido':
        return <Badge className="bg-yellow-500 text-xs">Atendido</Badge>;
      case 'finalizado':
        return <Badge className="bg-emerald-500 text-xs">Finalizado</Badge>;
      case 'cancelado':
        return <Badge variant="destructive" className="text-xs">Cancelado</Badge>;
      default:
        return <Badge variant="outline" className="text-xs capitalize">{appointment.status}</Badge>;
    }
  };

  const handleDetailsClick = () => {
    if (onDetailsClick) {
      onDetailsClick(appointment.id);
      setIsOpen(false);
    }
  };

  // Don't show detailed content for intervals
  if (appointment.tipo === 'intervalo') {
    return (
      <div
        className={cn(className, isDragging && "opacity-50")}
        style={style}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="p-2 h-full flex items-center justify-center">
          <div className="text-center">
            <Clock className="w-4 h-4 mx-auto mb-1 text-gray-500" />
            <div className="text-sm font-medium text-gray-600">{appointment.paciente}</div>
            <div className="text-xs text-gray-500">
              {appointment.horarioInicio} - {appointment.horarioFim}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(className, isDragging && "opacity-50", "hover:scale-[1.02]")}
          style={style}
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="p-2 h-full flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span className="text-sm font-semibold truncate">
                    {appointment.paciente}
                  </span>
                </div>
                {getTypeIcon()}
              </div>
              
              <div className="flex items-center gap-1">
                <Stethoscope className="w-3 h-3" />
                <span className="text-xs text-gray-600 truncate">
                  {appointment.servico}
                </span>
              </div>
              
              <div className="text-xs text-gray-500">
                {appointment.horarioInicio} - {appointment.horarioFim}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              {getStatusBadge()}
              <span className="text-xs font-medium text-gray-600 truncate">
                {appointment.convenio}
              </span>
            </div>
          </div>
        </div>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Agendamento</h3>
            {getStatusBadge()}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <div>
                <div className="font-medium">{appointment.paciente}</div>
                <div className="text-sm text-gray-500">Paciente</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-gray-500" />
              <div>
                <div className="font-medium">{appointment.servico}</div>
                <div className="text-sm text-gray-500">Serviço</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <div>
                <div className="font-medium">
                  {appointment.horarioInicio} - {appointment.horarioFim}
                </div>
                <div className="text-sm text-gray-500">Horário</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {getTypeIcon()}
              <div>
                <div className="font-medium capitalize">{appointment.tipo}</div>
                <div className="text-sm text-gray-500">Tipo de Atendimento</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="w-4 h-4 p-0 rounded-full" />
              <div>
                <div className="font-medium">{appointment.convenio}</div>
                <div className="text-sm text-gray-500">Convênio</div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2 border-t">
            {onDetailsClick && (
              <Button size="sm" className="flex-1" onClick={handleDetailsClick}>
                <FileText className="w-4 h-4 mr-2" />
                Ver Detalhes
              </Button>
            )}
            <Button variant="outline" size="sm" className="flex-1">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
