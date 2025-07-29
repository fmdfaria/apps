import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, addWeeks, subDays, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const handlePrevious = () => {
    onDateChange(subDays(currentDate, 1));
  };

  const handleNext = () => {
    onDateChange(addDays(currentDate, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
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
        
        <span className="text-sm font-medium text-gray-900 min-w-[120px] text-center">
          {getDateRange()}
        </span>
        
        <Button variant="outline" size="sm" onClick={handleNext}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
