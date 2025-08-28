import React, { useState, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Search } from 'lucide-react';

interface Option {
  id: string;
  nome?: string;
  sigla?: string;
  disponivel?: boolean;
  [key: string]: any; // Permite propriedades extras
}

interface SingleSelectDropdownProps {
  options: Option[];
  selected?: Option | null;
  onChange: (selected: Option | null) => void;
  placeholder?: string;
  formatOption?: (option: Option) => string | React.ReactElement;
  headerText?: string;
  dotColor?: 'green' | 'blue' | 'red' | 'yellow' | 'purple' | 'gray' | 'orange' | 'pink';
  getDotColor?: (option: Option) => 'green' | 'blue' | 'red' | 'yellow' | 'purple' | 'gray' | 'orange' | 'pink' | undefined;
  getDisabled?: (option: Option) => boolean;
  searchFields?: string[];
  disabled?: boolean;
}

export function SingleSelectDropdown({ options, selected, onChange, placeholder = 'Selecione...', formatOption, headerText = 'Opções disponíveis', dotColor = 'green', getDotColor, getDisabled, searchFields = ['nome'], disabled = false }: SingleSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Função auxiliar para obter o texto de display de uma opção
  const getDisplayText = (option: Option): string => {
    if (formatOption) {
      const formatted = formatOption(option);
      return typeof formatted === 'string' ? formatted : '';
    }
    
    // Tentar usar o primeiro campo dos searchFields, depois 'nome' como fallback
    const displayField = searchFields[0] || 'nome';
    return (option as any)[displayField] || option.nome || option.id;
  };

  // Map dot colors to Tailwind classes
  const getDotColorClasses = (color: string) => {
    const colorMap = {
      green: 'bg-green-500 group-hover:bg-green-600',
      blue: 'bg-blue-500 group-hover:bg-blue-600',
      red: 'bg-red-500 group-hover:bg-red-600',
      yellow: 'bg-yellow-400 group-hover:bg-yellow-600',
      purple: 'bg-purple-400 group-hover:bg-purple-600',
      gray: 'bg-gray-400 group-hover:bg-gray-600',
      orange: 'bg-orange-400 group-hover:bg-orange-600',
      pink: 'bg-pink-400 group-hover:bg-pink-600'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  // Update trigger width when component mounts or trigger changes
  React.useEffect(() => {
    const updateWidth = () => {
      if (triggerRef.current) {
        setTriggerWidth(triggerRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    // Small delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(updateWidth, 0);
    
    return () => clearTimeout(timeoutId);
  }, [open, selected]);

  // Force update trigger width on window resize and initial mount
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

  // Update width when input focus state changes
  React.useEffect(() => {
    const updateWidth = () => {
      if (triggerRef.current) {
        setTriggerWidth(triggerRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    // Additional delay for focus state changes
    const timeoutId = setTimeout(updateWidth, 50);
    
    return () => clearTimeout(timeoutId);
  }, [inputFocused]);

  // Handle wheel events for scroll functionality
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const delta = e.deltaY;
      
      // Check if we can scroll in the intended direction
      const canScrollUp = scrollTop > 0;
      const canScrollDown = scrollTop < scrollHeight - clientHeight;
      
      if ((delta > 0 && canScrollDown) || (delta < 0 && canScrollUp)) {
        // Usar scrollBy ao invés de preventDefault para evitar erro de passive listener
        container.scrollBy({ top: delta, behavior: 'auto' });
      }
    }
  }, []);

  function normalize(str: string) {
    return str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  }
  const lowerInput = normalize(input);
  const filtered = options.filter(opt => {
    // Busca nos campos especificados em searchFields
    return searchFields.some(field => {
      const value = (opt as any)[field];
      if (value && typeof value === 'string') {
        return normalize(value).includes(lowerInput);
      }
      return false;
    });
  });
  const showOptions = input.trim() === '' ? options : filtered;

  function handleSelect(opt: Option) {
    onChange(opt);
    setInput('');
    setOpen(false);
    if (inputRef.current) inputRef.current.blur();
  }

  function handleClear() {
    onChange(null);
    setInput('');
    if (inputRef.current) inputRef.current.focus();
  }

  // Popover deve abrir se input está focado ou há texto, mas não se estiver disabled
  const popoverOpen = !disabled && (open || inputFocused || input.length > 0);

  // Update width when popover opens (especially for input mode)
  React.useEffect(() => {
    if (popoverOpen && triggerRef.current) {
      const updateWidth = () => {
        if (triggerRef.current) {
          setTriggerWidth(triggerRef.current.offsetWidth);
        }
      };
      
      updateWidth();
      // Delay to ensure popover is fully rendered
      const timeoutId = setTimeout(updateWidth, 10);
      
      return () => clearTimeout(timeoutId);
    }
  }, [popoverOpen]);

  return (
    <div className="w-full max-w-full block">
      <Popover open={popoverOpen} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            ref={triggerRef}
            className={`w-full border-2 rounded-xl px-4 py-2 flex items-center gap-3 min-h-[44px] transition-all duration-200 shadow-sm overflow-hidden ${
              disabled 
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
                : 'border-gray-200 bg-white cursor-pointer hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 hover:shadow-md'
            }`}
            tabIndex={disabled ? -1 : 0}
            onClick={disabled ? undefined : () => {
              setOpen(true);
              if (inputRef.current) inputRef.current.focus();
              // Force width update when trigger is clicked
              setTimeout(() => {
                if (triggerRef.current) {
                  setTriggerWidth(triggerRef.current.offsetWidth);
                }
              }, 0);
            }}
          >
           <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
           
           {/* Mostrar item selecionado ou input de busca */}
           {selected && !inputFocused && input === '' ? (
             <div className="flex items-center flex-1 min-w-0">
               <div 
                 className="text-gray-700 font-medium truncate flex-1" 
                 title={getDisplayText(selected)}
               >
                 {formatOption ? formatOption(selected) : getDisplayText(selected)}
               </div>
               {!disabled && (
                 <button 
                   type="button" 
                   onClick={e => { 
                     e.stopPropagation(); 
                     handleClear(); 
                   }} 
                   className="flex-shrink-0 hover:bg-gray-100 rounded-full p-1 transition-colors duration-150 focus:outline-none ml-2"
                   title={`Remover ${getDisplayText(selected)}`}
                 >
                   <span className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 text-sm font-bold">×</span>
                 </button>
               )}
             </div>
           ) : (
             <input
               ref={inputRef}
               type="text"
               value={input}
               onChange={e => setInput(e.target.value)}
               onFocus={() => {
                 setInputFocused(true);
                 // Force width update when input gets focus
                 setTimeout(() => {
                   if (triggerRef.current) {
                     setTriggerWidth(triggerRef.current.offsetWidth);
                   }
                 }, 0);
               }}
               onBlur={() => {
                 setInputFocused(false);
                 // Force width update when input loses focus
                 setTimeout(() => {
                   if (triggerRef.current) {
                     setTriggerWidth(triggerRef.current.offsetWidth);
                   }
                 }, 0);
               }}
               placeholder={selected ? getDisplayText(selected) : placeholder}
               className="flex-1 border-none outline-none bg-transparent text-gray-700 placeholder:text-gray-400 font-medium min-w-0"
               autoComplete="off"
               disabled={disabled}
             />
           )}
           
           <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ml-2 ${popoverOpen ? 'rotate-180' : ''}`} />
         </div>
      </PopoverTrigger>
      <PopoverContent 
        className="bg-white border-2 border-gray-200 shadow-xl rounded-xl p-0 text-gray-900 z-50 w-full" 
        onOpenAutoFocus={(e) => e.preventDefault()}
        style={{ 
          maxHeight: '18rem',
          width: triggerWidth ? `${triggerWidth}px` : '100%',
          minWidth: triggerWidth ? `${triggerWidth}px` : '100%',
          maxWidth: 'calc(100vw - 2rem)'
        }}
        onWheel={(e) => {
          // Allow wheel events to pass through to children
          e.stopPropagation();
        }}
        align="start"
        sideOffset={4}
        side="bottom"
        avoidCollisions={true}
      >
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-gray-700">
              {input.trim() ? `Resultados para "${input.trim()}"` : headerText}
            </span>
          </div>
        </div>
        
        <div 
          ref={scrollRef}
          className="overflow-y-auto overscroll-contain p-2" 
          style={{ 
            maxHeight: '12rem',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
          onWheel={handleWheel}
        >
          {showOptions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 font-medium">Nenhuma opção encontrada</p>
              <p className="text-xs text-gray-400 mt-1">Tente buscar com outros termos</p>
            </div>
          )}
          
          {showOptions.map(opt => {
            const itemDotColor = getDotColor ? getDotColor(opt) : dotColor;
            const isDisabled = getDisabled ? getDisabled(opt) : false;
            
            return (
              <div
                key={opt.id}
                className={`group px-3 py-2.5 rounded-lg text-sm border border-transparent transition-all duration-150 flex items-center gap-3 ${
                  isDisabled 
                    ? 'cursor-not-allowed opacity-50 bg-gray-50' 
                    : 'cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 hover:border-green-200'
                }`}
                onClick={() => !isDisabled && handleSelect(opt)}
                title={isDisabled ? 'Esta opção não está disponível' : undefined}
              >
                <div className={`w-2 h-2 ${getDotColorClasses(itemDotColor || dotColor)} rounded-full transition-colors duration-150`}></div>
                <div className={`font-medium transition-colors duration-150 flex-1 ${
                  isDisabled 
                    ? 'text-gray-400' 
                    : 'text-gray-700 group-hover:text-gray-900'
                }`}>
                  {formatOption ? formatOption(opt) : getDisplayText(opt)}
                </div>
              </div>
            );
          })}
          
        </div>
      </PopoverContent>
    </Popover>
    </div>
  );
}