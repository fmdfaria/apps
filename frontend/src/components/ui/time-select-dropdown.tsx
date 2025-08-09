import React, { useState, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';

interface TimeOption {
  id: string;
  nome: string;
}

interface TimeSelectDropdownProps {
  options: TimeOption[];
  selected?: TimeOption | null;
  onChange: (selected: TimeOption | null) => void;
  placeholder?: string;
  headerText?: string;
  disabled?: boolean;
}

export function TimeSelectDropdown({ 
  options, 
  selected, 
  onChange, 
  placeholder = 'Selecione...', 
  headerText = 'Horários disponíveis',
  disabled = false
}: TimeSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Update trigger width when component mounts or trigger changes
  React.useEffect(() => {
    const updateWidth = () => {
      if (triggerRef.current) {
        setTriggerWidth(triggerRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    const timeoutId = setTimeout(updateWidth, 0);
    
    return () => clearTimeout(timeoutId);
  }, [open, selected]);

  // Force update trigger width on window resize
  React.useEffect(() => {
    const updateWidth = () => {
      if (triggerRef.current) {
        setTriggerWidth(triggerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Handle wheel events for scroll functionality
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const delta = e.deltaY;
      
      const canScrollUp = scrollTop > 0;
      const canScrollDown = scrollTop < scrollHeight - clientHeight;
      
      if ((delta > 0 && canScrollDown) || (delta < 0 && canScrollUp)) {
        container.scrollBy({ top: delta, behavior: 'auto' });
      }
    }
  }, []);

  function handleSelect(opt: TimeOption) {
    if (!disabled) {
      onChange(opt);
      setOpen(false);
    }
  }

  return (
    <div className="w-full max-w-full block">
      <Popover open={!disabled && open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <div
            ref={triggerRef}
            className={`w-full border-2 rounded-xl px-2 sm:px-3 py-2 flex items-center justify-between min-h-[36px] transition-all duration-200 shadow-sm overflow-hidden ${
              disabled 
                ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60' 
                : 'border-gray-200 bg-white cursor-pointer hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 hover:shadow-md'
            }`}
            tabIndex={disabled ? -1 : 0}
            onClick={() => {
              if (!disabled) {
                setOpen(true);
                setTimeout(() => {
                  if (triggerRef.current) {
                    setTriggerWidth(triggerRef.current.offsetWidth);
                  }
                }, 0);
              }
            }}
          >
           {/* Mostrar item selecionado */}
           {selected ? (
             <span 
               className="text-gray-700 font-medium truncate flex-1 text-center text-sm sm:text-base" 
               title={selected.nome}
             >
               {selected.nome}
             </span>
           ) : (
             <span className="text-gray-400 text-xs sm:text-sm text-center flex-1 truncate">{placeholder}</span>
           )}
           
           <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 transition-transform duration-200 ml-1 ${
             disabled ? 'text-gray-300' : 'text-gray-400'
           } ${!disabled && open ? 'rotate-180' : ''}`} />
         </div>
      </PopoverTrigger>
      <PopoverContent 
        className="bg-white border-2 border-gray-200 shadow-xl rounded-xl p-0 text-gray-900 z-50 w-full" 
        onOpenAutoFocus={(e) => e.preventDefault()}
        style={{ 
          maxHeight: '12rem',
          width: triggerWidth ? `${Math.max(triggerWidth, 120)}px` : '100%',
          minWidth: '120px',
          maxWidth: 'calc(100vw - 2rem)'
        }}
        onWheel={(e) => {
          e.stopPropagation();
        }}
        align="start"
        sideOffset={4}
        side="bottom"
        avoidCollisions={true}
      >
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border-b border-gray-200 px-3 py-2 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-700 text-center block">
            {headerText}
          </span>
        </div>
        
        <div 
          ref={scrollRef}
          className="overflow-y-auto overscroll-contain p-1" 
          style={{ 
            maxHeight: '8rem',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
          onWheel={handleWheel}
        >
          {options.map(opt => (
            <div
              key={opt.id}
              className="group px-2 py-1.5 rounded-md text-sm border border-transparent transition-all duration-150 flex items-center justify-center cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 hover:border-blue-200"
              onClick={() => handleSelect(opt)}
            >
              <span className="font-medium text-gray-700 group-hover:text-gray-900 text-center">
                {opt.nome}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
    </div>
  );
}