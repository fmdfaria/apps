import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { format, addDays, addWeeks, subDays, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: 'day' | 'week';
  onDateChange: (date: Date) => void;
  onViewModeChange?: (mode: 'day' | 'week') => void;
}

export const CalendarHeader = ({
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange
}: CalendarHeaderProps) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handlePrevious = () => {
    onDateChange(subDays(currentDate, 1));
  };

  const handleNext = () => {
    onDateChange(addDays(currentDate, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date);
      setIsCalendarOpen(false);
    }
  };

  const getDateRange = () => {
    return format(currentDate, "EEE, dd MMM", { locale: ptBR });
  };

  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handlePrevious}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="text-sm font-medium text-gray-900 min-w-[120px] hover:bg-blue-50 hover:text-blue-700 hover:border hover:border-blue-200 flex items-center gap-2 transition-all duration-200 rounded-lg"
            >
              <CalendarIcon className="w-4 h-4" />
              {getDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={handleDateSelect}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        <Button variant="outline" size="sm" onClick={handleNext}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
