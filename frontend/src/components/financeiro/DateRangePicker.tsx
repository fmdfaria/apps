import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  startLabel?: string;
  endLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startLabel = "Data inicial",
  endLabel = "Data final",
  className,
  disabled = false
}: DateRangePickerProps) {
  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = parseISO(dateString);
      return format(date, 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };

  const formatDateForDisplay = (dateString?: string) => {
    if (!dateString) return 'Selecione uma data';
    try {
      const date = parseISO(dateString);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const handleDateChange = (date: Date | undefined, onChange: (date: string) => void) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
    }
  };

  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      <div className="space-y-2">
        <Label>{startLabel}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateForDisplay(startDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate ? parseISO(startDate) : undefined}
              onSelect={(date) => handleDateChange(date, onStartDateChange)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Input
          type="date"
          value={formatDateForInput(startDate)}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="sr-only"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label>{endLabel}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateForDisplay(endDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate ? parseISO(endDate) : undefined}
              onSelect={(date) => handleDateChange(date, onEndDateChange)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Input
          type="date"
          value={formatDateForInput(endDate)}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="sr-only"
          disabled={disabled}
        />
      </div>
    </div>
  );
}