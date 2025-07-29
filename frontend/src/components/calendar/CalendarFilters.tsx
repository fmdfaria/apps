import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Calendar as CalendarIcon, Users, Monitor, CreditCard } from 'lucide-react';

interface CalendarFiltersProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: 'day' | 'week';
  onViewModeChange: (mode: 'day' | 'week') => void;
  filters: {
    professionals: string[];
    appointmentType: 'all' | 'online' | 'presencial';
    insurance: string;
    resource: string;
  };
  onFiltersChange: (filters: any) => void;
  profissionais: Array<{
    id: string;
    nome: string;
    avatar: string;
    horarioInicio: string;
    horarioFim: string;
    cor: string;
  }>;
  convenios?: string[];
}

export const CalendarFilters = ({
  currentDate,
  onDateChange,
  filters,
  onFiltersChange,
  profissionais,
  convenios = []
}: CalendarFiltersProps) => {
  const handleProfessionalToggle = (professionalId: string) => {
    const newProfessionals = filters.professionals.includes(professionalId)
      ? filters.professionals.filter(id => id !== professionalId)
      : [...filters.professionals, professionalId];
    
    onFiltersChange({
      ...filters,
      professionals: newProfessionals
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      professionals: [],
      appointmentType: 'all',
      insurance: 'all',
      resource: 'all'
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="w-5 h-5" />
            Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={(date) => date && onDateChange(date)}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="flex items-center gap-2 text-sm font-medium mb-3">
              <Users className="w-4 h-4" />
              Profissionais
            </Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {profissionais.map((profissional) => (
                <div key={profissional.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={profissional.id}
                    checked={filters.professionals.includes(profissional.id)}
                    onCheckedChange={() => handleProfessionalToggle(profissional.id)}
                  />
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                      style={{ backgroundColor: profissional.cor }}
                    >
                      {profissional.avatar}
                    </div>
                    <Label htmlFor={profissional.id} className="text-sm cursor-pointer">
                      {profissional.nome}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Monitor className="w-4 h-4" />
              Tipo de Atendimento
            </Label>
            <Select
              value={filters.appointmentType}
              onValueChange={(value: 'all' | 'online' | 'presencial') =>
                onFiltersChange({ ...filters, appointmentType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="flex items-center gap-2 text-sm font-medium mb-2">
              <CreditCard className="w-4 h-4" />
              Convênio
            </Label>
            <Select
              value={filters.insurance}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, insurance: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {convenios.map((convenio) => (
                  <SelectItem key={convenio} value={convenio.toLowerCase()}>
                    {convenio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={clearFilters} className="w-full">
            Limpar Filtros
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
