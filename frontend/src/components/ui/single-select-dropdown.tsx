import React, { useState, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Search } from 'lucide-react';

interface Option {
  id: string;
  nome: string;
  sigla?: string;
}

interface SingleSelectDropdownProps {
  options: Option[];
  selected?: Option | null;
  onChange: (selected: Option | null) => void;
  placeholder?: string;
  formatOption?: (option: Option) => string;
}

export function SingleSelectDropdown({ options, selected, onChange, placeholder = 'Selecione...', formatOption }: SingleSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Update trigger width when component mounts or trigger changes
  React.useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open, selected]);

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
        e.preventDefault();
        e.stopPropagation();
        container.scrollTop += delta;
      }
    }
  }, []);

  function normalize(str: string) {
    return str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  }
  const lowerInput = normalize(input);
  const filtered = options.filter(opt => {
    const nomeMatch = normalize(opt.nome).includes(lowerInput);
    const siglaMatch = opt.sigla ? normalize(opt.sigla).includes(lowerInput) : false;
    return nomeMatch || siglaMatch;
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

  // Popover deve abrir se input está focado ou há texto
  const popoverOpen = open || inputFocused || input.length > 0;

  return (
    <div className="w-full max-w-full">
      <Popover open={popoverOpen} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            ref={triggerRef}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 flex items-center gap-3 min-h-[44px] bg-white cursor-pointer hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all duration-200 shadow-sm hover:shadow-md"
            tabIndex={0}
            onClick={() => {
              setOpen(true);
              if (inputRef.current) inputRef.current.focus();
            }}
          >
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          
          {/* Mostrar item selecionado ou input de busca */}
          {selected && !inputFocused && input === '' ? (
            <div className="flex items-center flex-1 min-w-0">
              <span 
                className="text-gray-700 font-medium truncate flex-1" 
                title={formatOption ? formatOption(selected) : selected.nome}
              >
                {formatOption ? formatOption(selected) : selected.nome}
              </span>
              <button 
                type="button" 
                onClick={e => { 
                  e.stopPropagation(); 
                  handleClear(); 
                }} 
                className="flex-shrink-0 hover:bg-gray-100 rounded-full p-1 transition-colors duration-150 focus:outline-none ml-2"
                title={`Remover ${selected.nome}`}
              >
                <span className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 text-sm font-bold">×</span>
              </button>
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={selected ? (formatOption ? formatOption(selected) : selected.nome) : placeholder}
              className="flex-1 border-none outline-none bg-transparent text-gray-700 placeholder:text-gray-400 font-medium"
              autoComplete="off"
            />
          )}
          
          <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${popoverOpen ? 'rotate-180' : ''}`} />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="bg-white border-2 border-gray-200 shadow-xl rounded-xl p-0 text-gray-900 z-50" 
        onOpenAutoFocus={(e) => e.preventDefault()}
        style={{ 
          maxHeight: '18rem',
          width: triggerWidth || 'auto'
        }}
        onWheel={(e) => {
          // Allow wheel events to pass through to children
          e.stopPropagation();
        }}
        align="start"
        sideOffset={4}
      >
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-gray-700">
              {input.trim() ? `Resultados para "${input.trim()}"` : 'Conselhos disponíveis'}
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
              <p className="text-sm text-gray-500 font-medium">Nenhum conselho encontrado</p>
              <p className="text-xs text-gray-400 mt-1">Tente buscar com outros termos</p>
            </div>
          )}
          
          {showOptions.map(opt => (
            <div
              key={opt.id}
              className="group cursor-pointer px-3 py-2.5 rounded-lg text-sm hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 hover:border-green-200 border border-transparent transition-all duration-150 flex items-center gap-3"
              onClick={() => handleSelect(opt)}
            >
              <div className="w-2 h-2 bg-green-400 rounded-full group-hover:bg-green-600 transition-colors duration-150"></div>
              <span className="font-medium text-gray-700 group-hover:text-gray-900">
                {formatOption ? formatOption(opt) : opt.nome}
              </span>
            </div>
          ))}
          
        </div>
      </PopoverContent>
    </Popover>
    </div>
  );
}